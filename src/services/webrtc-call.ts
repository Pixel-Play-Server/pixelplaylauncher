import { invoke } from "@tauri-apps/api/core";
import type { CallState } from "./pixel-friends-service";

export type AudioDeviceInfo = { deviceId: string; label: string; kind: "audioinput" | "audiooutput" };
const STUN: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 480, max: 640 }, height: { ideal: 270, max: 360 }, frameRate: { ideal: 12, max: 15 },
};
type Handlers = {
  onLocalStream?: (s: MediaStream | null) => void;
  onRemoteStream?: (s: MediaStream | null) => void;
  onMicLevel?: (level: number) => void;
  onError?: (msg: string) => void;
  onConnected?: () => void;
  onMicDevice?: (id: string) => void;
  onStatus?: (status: string) => void;
  onFrame?: (side: "local" | "remote", frame: string | null) => void;
};
export type RTCSignal = { call?: string | CallState; action?: string; sdp?: string; candidate?: string; sdpMid?: string; sdpMLineIndex?: number };

/** One media session per call. SDP is serialized; ICE waits for the remote description. */
export class WebRTCCall {
  private pc: RTCPeerConnection | null = null;
  private native = false;
  private nativeLifecycle: Promise<unknown> = Promise.resolve();
  private nativeCommand(settings: object) { return invoke("social_native_command", { settings }); }
  handleNativeMedia(ev: { call?: string; callID?: string; event?: string; status?: string; connection?: string; mic?: string; error?: string; level?: number; side?: "local" | "remote"; frame?: string | null }) {
    if (!this.native || (ev.callID ?? ev.call) !== this.callId) return;
    if (ev.event === "frame" && ev.side) this.handlers.onFrame?.(ev.side, ev.frame ?? null);
    if (ev.event === "level") this.handlers.onMicLevel?.(ev.level ?? 0);
    if (ev.status) this.handlers.onStatus?.(ev.status);
    if (ev.mic) this.handlers.onMicDevice?.(ev.mic);
    if (ev.connection === "connected") this.handlers.onConnected?.();
    if (ev.error) this.handlers.onError?.(ev.error);
  }
  private local: MediaStream | null = null;
  private remote: MediaStream | null = null;
  private videoSender: RTCRtpSender | null = null;
  private callId = "";
  private polite = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private initialNegotiated = false;
  private handlers: Handlers = {};
  private audioCtx: AudioContext | null = null;
  private levelTimer: number | null = null;
  private restartTimer: number | null = null;
  private preferredMicId = "";
  private preferredSpeakerId = "";
  private preferredCamId = "";
  private muted = false;
  private deafened = false;
  private ready: Promise<void> = Promise.resolve();
  private operations: Promise<void> = Promise.resolve();
  private pendingIce: RTCIceCandidateInit[] = [];
  private earlySignals: RTCSignal[] = [];
  private generation = 0;
  private retryCount = 0;

  configure(h: Handlers) { this.handlers = { ...this.handlers, ...h }; }
  setDevices(mic: string, speaker: string, camera = "") {
    this.preferredMicId = mic === "default" ? "" : mic;
    this.preferredSpeakerId = speaker;
    this.preferredCamId = camera === "default" ? "" : camera;
  }
  private enqueue(work: () => Promise<void>) {
    const generation = this.generation;
    const task = this.operations.then(async () => { if (generation === this.generation) await work(); });
    this.operations = task.catch((e) => {
      if (generation === this.generation) this.handlers.onError?.(e instanceof Error ? e.message : String(e));
    });
    return task;
  }
  start(call: CallState, withVideo: boolean): Promise<void> {
    if (this.callId === call.id) return this.ready;
    const early = this.earlySignals.filter((s) => s.call === call.id);
    void this.stop(); // teardown is synchronous; never yield before claiming this call
    this.callId = call.id;
    this.polite = call.direction === "in";
    this.muted = call.muted;
    this.deafened = call.deafened;
    const generation = this.generation;
    if (typeof RTCPeerConnection === "undefined") {
      this.native = true;
      this.ready = this.nativeLifecycle.catch(() => undefined).then(() => invoke<void>("social_native_start", { settings: { mic: this.preferredMicId, speaker: this.preferredSpeakerId, camera: this.preferredCamId, video: withVideo } }));
      this.nativeLifecycle = this.ready;
      void this.ready.then(async () => { if (generation === this.generation) for (const signal of early) await this.handleSignal(signal); }).catch((e) => this.handlers.onError?.(String(e)));
      return this.ready;
    }
    const pc = new RTCPeerConnection({ iceServers: STUN });
    this.pc = pc;
    this.handlers.onStatus?.("Conectando audio directo…");
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && pc === this.pc) void this.signal("ice", candidate.toJSON()).catch((e) => this.handlers.onError?.(String(e)));
    };
    pc.ontrack = ({ track }) => {
      if (pc !== this.pc) return;
      if (!this.remote) this.remote = new MediaStream();
      if (!this.remote.getTracks().includes(track)) this.remote.addTrack(track);
      const publish = () => {
        if (pc !== this.pc) return;
        this.handlers.onRemoteStream?.(new MediaStream(this.remote!.getTracks()));
        if (track.kind === "audio") void this.resumeAudio();
      };
      track.onunmute = publish;
      track.onmute = publish;
      track.onended = () => { this.remote?.removeTrack(track); publish(); };
      publish();
    };
    pc.onnegotiationneeded = () => {
      if (pc === this.pc && (!this.polite && !this.initialNegotiated)) void this.enqueue(() => this.offer());
    };
    pc.onconnectionstatechange = () => {
      if (pc !== this.pc) return;
      if (pc.connectionState === "connected") {
        this.retryCount = 0;
        if (this.restartTimer) window.clearTimeout(this.restartTimer);
        this.restartTimer = null;
        this.handlers.onStatus?.("Conectado · audio/video P2P");
        this.handlers.onConnected?.();
        void this.capBitrate();
        void this.resumeAudio();
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.handlers.onStatus?.("Reconectando audio directo…");
        if (!this.restartTimer) this.restartTimer = window.setTimeout(() => {
          this.restartTimer = null;
          if (pc === this.pc && pc.connectionState !== "connected") void this.restart();
        }, pc.connectionState === "failed" ? 1000 : 5000);
      }
    };
    // Candidate gathering can exceed six seconds on real networks; keep ICE alive.
    this.ready = (async () => {
      try {
        const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
        if (this.preferredMicId) audio.deviceId = { exact: this.preferredMicId };
        let stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
        if (!this.preferredMicId) {
          const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId !== "default");
          const physical = devices.find((d) => /quadcast/i.test(d.label))
            ?? devices.find((d) => /digital microphone|microphone|micrófono/i.test(d.label) && !/monitor|virtual/i.test(d.label));
          if (physical && stream.getAudioTracks()[0]?.getSettings().deviceId !== physical.deviceId) {
            const previous = stream;
            try { stream = await navigator.mediaDevices.getUserMedia({ audio: { ...audio, deviceId: { exact: physical.deviceId } }, video: false }); previous.getTracks().forEach((t) => t.stop()); }
            catch { /* Keep the working system capture; a device may have just been unplugged. */ }
          }
        }
        if (generation !== this.generation) { stream.getTracks().forEach((t) => t.stop()); return; }
        this.local = stream;
        this.handlers.onMicDevice?.(stream.getAudioTracks()[0]?.getSettings().deviceId ?? "default");
        const mic = stream.getAudioTracks()[0];
        mic.enabled = !this.muted;
        pc.addTrack(mic, stream);
        // A sending video slot exists from the initial offer, including audio-only calls.
        if (!this.polite) this.videoSender = pc.addTransceiver("video", { direction: "sendrecv", streams: [stream] }).sender;
        this.publishLocal();
        this.hookLevel(stream);
        if (withVideo && this.videoSender) await this.setCamera(true);
      } catch (e) {
        if (generation === this.generation) {
          this.handlers.onStatus?.("Micrófono no disponible");
          this.handlers.onError?.(e instanceof Error ? e.message : String(e));
        }
        throw e;
      }
    })();
    void this.ready.then(async () => {
      if (pc !== this.pc) return;
      for (const signal of early) await this.handleSignal(signal);
      if (!this.polite) await this.enqueue(() => this.offer());
    }).catch(() => undefined);
    return this.ready;
  }
  private async offer(restart = false) {
    await this.ready;
    const pc = this.pc;
    if (!pc || this.makingOffer || pc.signalingState !== "stable") return;
    this.makingOffer = true;
    try {
      const offer = await pc.createOffer(restart ? { iceRestart: true } : undefined);
      if (pc !== this.pc) return;
      await pc.setLocalDescription(offer);
      await this.signal("offer", { sdp: pc.localDescription!.sdp });
    } finally { this.makingOffer = false; }
  }
  async handleSignal(ev: RTCSignal) {
    if (!ev.action || ev.action === "prefer-pcm") return; // relay is deliberately disabled
    if (typeof ev.call === "string" && ev.call !== this.callId) {
      if (!this.callId && this.earlySignals.length < 64) this.earlySignals.push(ev);
      return;
    }
    return this.enqueue(async () => {
      await this.ready;
      if (this.native) { await this.nativeCommand({ action: "signal", signal: ev }); return; }
      const pc = this.pc;
      if (!pc) return;
      if ((ev.action === "offer" || ev.action === "answer") && ev.sdp) {
        const collision = ev.action === "offer" && (this.makingOffer || pc.signalingState !== "stable");
        this.ignoreOffer = !this.polite && collision;
        if (this.ignoreOffer) return;
        if (collision) await pc.setLocalDescription({ type: "rollback" });
        if (ev.action === "answer" && pc.signalingState !== "have-local-offer") return;
        await pc.setRemoteDescription({ type: ev.action, sdp: ev.sdp });
        if (ev.action === "offer") {
          const video = pc.getTransceivers().find((t) => t.mid !== null && t.receiver.track.kind === "video");
          if (video) { video.direction = "sendrecv"; this.videoSender = video.sender; }
        }
        for (const candidate of this.pendingIce.splice(0)) await pc.addIceCandidate(candidate);
        if (ev.action === "offer") {
          await pc.setLocalDescription(await pc.createAnswer());
          await this.signal("answer", { sdp: pc.localDescription!.sdp });
        }
        this.initialNegotiated = true;
        await this.capBitrate();
      } else if (ev.action === "ice" && ev.candidate && !this.ignoreOffer) {
        const candidate = { candidate: ev.candidate, sdpMid: ev.sdpMid, sdpMLineIndex: ev.sdpMLineIndex };
        if (!pc.remoteDescription) this.pendingIce.push(candidate);
        else await pc.addIceCandidate(candidate);
      }
    });
  }
  async restart() {
    if (this.native) { await this.nativeCommand({ action: "restart" }); return; }
    if (!this.pc) return;
    this.handlers.onStatus?.("Reconectando audio directo…");
    this.retryCount++;
    await this.enqueue(() => this.offer(true));
    const pc = this.pc;
    if (!this.restartTimer) this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      if (pc && pc === this.pc && pc.connectionState !== "connected") {
        if (this.retryCount < 3) void this.restart();
        else this.handlers.onStatus?.("No se pudo conectar. Reintentar conexión");
      }
    }, 15000);
  }
  async setMuted(value: boolean) { this.muted = value; if (this.native) { await this.nativeCommand({ action: "mute", on: value }); return; } this.local?.getAudioTracks().forEach((t) => { t.enabled = !value; }); }
  async setDeafened(value: boolean) {
    this.deafened = value;
    if (this.native) { await this.nativeCommand({ action: "deafen", on: value }); return; }
    const el = document.getElementById("pp-webrtc-remote-audio") as HTMLAudioElement | null;
    if (el) el.muted = value;
  }
  private publishLocal() { this.handlers.onLocalStream?.(this.local ? new MediaStream(this.local.getTracks()) : null); }
  async setCamera(on: boolean) {
    if (this.native) { await this.ready; await this.nativeCommand({ action: "camera", on, device: this.preferredCamId }); return; }
    if (!this.pc || !this.local || !this.videoSender) throw new Error("Espera a que esté listo el micrófono");
    if (on) {
      const video = { ...VIDEO_CONSTRAINTS, ...(this.preferredCamId ? { deviceId: { exact: this.preferredCamId } } : {}) };
      const cam = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      const pc = this.pc;
      const track = cam.getVideoTracks()[0];
      if (!pc || pc.signalingState === "closed") { track.stop(); return; }
      await this.videoSender.replaceTrack(track);
      this.local.getVideoTracks().forEach((old) => { old.stop(); this.local!.removeTrack(old); });
      this.local.addTrack(track);
      this.publishLocal();
      await this.capBitrate();
    } else {
      await this.videoSender.replaceTrack(null);
      this.local.getVideoTracks().forEach((t) => { t.stop(); this.local!.removeTrack(t); });
      this.publishLocal();
    }
  }
  async switchCamera(id: string) { this.preferredCamId = id === "default" ? "" : id; await this.setCamera(true); }
  async switchMic(id: string) {
    this.preferredMicId = id === "default" ? "" : id;
    if (this.native) { await this.nativeCommand({ action: "mic", device: this.preferredMicId }); return; }
    if (!this.pc || !this.local) return;
    const pc = this.pc;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      ...(this.preferredMicId ? { deviceId: { exact: this.preferredMicId } } : {}),
    }, video: false });
    const track = stream.getAudioTracks()[0];
    if (pc !== this.pc) { track.stop(); return; }
    track.enabled = !this.muted;
    const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
    await sender?.replaceTrack(track);
    this.local.getAudioTracks().forEach((t) => { t.stop(); this.local!.removeTrack(t); });
    this.local.addTrack(track);
    this.publishLocal();
    this.hookLevel(this.local);
  }
  async switchSpeaker(id: string) { this.preferredSpeakerId = id; if (this.native) { await this.nativeCommand({ action: "speaker", device: id }); return; } await this.resumeAudio(); }
  async resumeAudio() {
    if (this.native) { await this.nativeCommand({ action: "deafen", on: this.deafened }); return; }
    await this.audioCtx?.resume();
    if (!this.remote?.getAudioTracks().length) return;
    let el = document.getElementById("pp-webrtc-remote-audio") as HTMLAudioElement | null;
    if (!el) { el = document.createElement("audio"); el.id = "pp-webrtc-remote-audio"; el.autoplay = true; el.style.display = "none"; document.body.appendChild(el); }
    if (el.srcObject !== this.remote) el.srcObject = this.remote;
    el.muted = this.deafened;
    if ("setSinkId" in el && this.preferredSpeakerId) await (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(this.preferredSpeakerId);
    try { await el.play(); } catch { this.handlers.onStatus?.("Pulsa Activar audio para escuchar la llamada"); }
  }
  private async capBitrate() {
    for (const sender of this.pc?.getSenders() ?? []) {
      const params = sender.getParameters();
      if (!params.encodings?.length) continue;
      params.encodings.forEach((enc) => {
        enc.maxBitrate = sender.track?.kind === "video" ? 350000 : 32000;
        if (sender.track?.kind === "video") enc.maxFramerate = 12;
      });
      try { await sender.setParameters(params); } catch { /* Some WebKit builds expose read-only sender limits; capture remains capped. */ }
    }
  }
  stop(): Promise<void> {
    if (this.native) this.nativeLifecycle = this.nativeLifecycle.catch(() => undefined).then(() => invoke("social_native_stop")).catch((e) => this.handlers.onError?.(String(e)));
    this.native = false;
    this.handlers.onFrame?.("local", null); this.handlers.onFrame?.("remote", null);
    this.generation++;
    this.callId = "";
    if (this.levelTimer) window.clearInterval(this.levelTimer);
    if (this.restartTimer) window.clearTimeout(this.restartTimer);
    this.levelTimer = this.restartTimer = null;
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = this.remote = null;
    if (this.pc) { this.pc.onconnectionstatechange = null; this.pc.ontrack = null; this.pc.onnegotiationneeded = null; this.pc.onicecandidate = null; this.pc.close(); }
    this.pc = null; this.videoSender = null;
    this.audioCtx?.close().catch(() => undefined); this.audioCtx = null;
    const el = document.getElementById("pp-webrtc-remote-audio") as HTMLAudioElement | null;
    if (el) { el.pause(); el.srcObject = null; }
    this.pendingIce = []; this.earlySignals = [];
    this.initialNegotiated = this.makingOffer = this.ignoreOffer = false;
    this.operations = this.ready = Promise.resolve();
    this.retryCount = 0;
    this.handlers.onLocalStream?.(null); this.handlers.onRemoteStream?.(null); this.handlers.onMicLevel?.(0);
    return Promise.resolve();
  }
  private hookLevel(stream: MediaStream) {
    if (this.levelTimer) window.clearInterval(this.levelTimer);
    this.audioCtx?.close().catch(() => undefined);
    const ctx = new AudioContext(); this.audioCtx = ctx;
    const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
    ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(analyser);
    void ctx.resume();
    const data = new Uint8Array(analyser.fftSize);
    this.levelTimer = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      const level = this.muted ? 0 : Math.sqrt(data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / data.length);
      this.handlers.onMicLevel?.(level);
    }, 100);
  }
  private signal(action: string, extra: object = {}) { return invoke("social_webrtc", { action, ...extra }); }
}
export type MediaDeviceInfoPP = {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
};

/** Ask for mic+cam once so enumerateDevices() returns real labels (not empty). */
export async function listMediaDevices(): Promise<MediaDeviceInfoPP[]> {
  if (typeof RTCPeerConnection === "undefined") return invoke<MediaDeviceInfoPP[]>("social_native_devices");
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  // Only probe getUserMedia if labels are still blank (don't steal active call tracks).
  let probe: MediaStream | null = null;
  try {
    const pre = await navigator.mediaDevices.enumerateDevices();
    const needsPerm = !pre.some((d) => d.label?.trim());
    if (needsPerm) {
      try {
        probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        try {
          probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          /* labels may stay blank */
        }
      }
    }
  } catch {
    /* ignore */
  }
  probe?.getTracks().forEach((t) => t.stop());

  const all = await navigator.mediaDevices.enumerateDevices();
  const pretty = (d: MediaDeviceInfo, i: number) => {
    if (d.label?.trim()) return d.label.trim();
    const n = i + 1;
    if (d.kind === "audioinput") return `Micrófono ${n}`;
    if (d.kind === "audiooutput") return `Altavoz ${n}`;
    return `Cámara ${n}`;
  };
  const counts: Record<string, number> = {};
  const seen = new Set<string>();
  const out: MediaDeviceInfoPP[] = [];
  for (const d of all) {
    if (d.kind !== "audioinput" && d.kind !== "audiooutput" && d.kind !== "videoinput") continue;
    const id = d.deviceId || "default";
    const key = `${d.kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts[d.kind] = (counts[d.kind] ?? 0) + 1;
    out.push({
      deviceId: id,
      label: pretty(d, counts[d.kind]! - 1),
      kind: d.kind as MediaDeviceInfoPP["kind"],
    });
  }
  // WebKitGTK often omits audiooutput entirely — keep a selectable default.
  if (!out.some((d) => d.kind === "audiooutput")) {
    out.push({ deviceId: "default", label: "Predeterminado del sistema", kind: "audiooutput" });
  }
  if (!out.some((d) => d.kind === "audioinput")) {
    out.push({ deviceId: "default", label: "Micrófono predeterminado", kind: "audioinput" });
  }
  return out;
}

/** @deprecated use listMediaDevices */
export async function listAudioDevices(): Promise<AudioDeviceInfo[]> {
  const all = await listMediaDevices();
  return all
    .filter((d) => d.kind === "audioinput" || d.kind === "audiooutput")
    .map((d) => ({ deviceId: d.deviceId, label: d.label, kind: d.kind as AudioDeviceInfo["kind"] }));
}

export const webrtcCall = new WebRTCCall();
