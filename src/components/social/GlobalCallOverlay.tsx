"use client";
import { CALLS_ENABLED } from "../../services/call-features";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { useThemeStore } from "../../store/useThemeStore";
import { useSocialCallStore } from "../../store/social-call-store";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { PlayerHeadshot } from "../account/PlayerHeadshot";
import {
  socialAccept,
  socialDeafen,
  socialHangup,
  socialMute,
} from "../../services/pixel-friends-service";
import { listMediaDevices, webrtcCall } from "../../services/webrtc-call";
import { useSocialPoll } from "../../hooks/useSocialPoll";

const fail = (err: unknown) => toast.error(err instanceof Error ? err.message : String(err));

function useElapsed(since?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!since) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [since]);
  if (!since) return "0:00";
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function CallControl({
  onClick,
  title,
  active,
  danger,
  accent,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  accent: string;
  children: ReactNode;
}) {
  const bg = danger ? "#dc2626" : active ? "#ef4444" : "rgba(255,255,255,0.08)";
  const border = danger || active ? "transparent" : `${accent}66`;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className="pp-call-ctrl group relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-white transition-transform duration-150 hover:scale-105 active:scale-95"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      {children}
    </button>
  );
}

function StreamVideo({ stream, mirror, className }: { stream: MediaStream | null; mirror?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);
  if (!stream || stream.getVideoTracks().length === 0) return null;
  return (
    <video
      ref={ref}
      muted
      playsInline
      autoPlay
      className={`${className ?? ""} ${mirror ? "scale-x-[-1]" : ""}`}
    />
  );
}

/** Custom dark picker — native <select> is unreadable on Linux WebKit (white-on-white). */
function DeviceList({
  label,
  devices,
  value,
  accent,
  emptyHint,
  onPick,
}: {
  label: string;
  devices: { deviceId: string; label: string }[];
  value: string;
  accent: string;
  emptyHint: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 font-minecraft-ten text-[10px] uppercase tracking-wide text-white/55">{label}</p>
      <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-white/15 bg-[#14141c] p-1">
        {devices.length === 0 ? (
          <p className="px-2 py-2 font-minecraft-ten text-[11px] text-white/40">{emptyHint}</p>
        ) : (
          devices.map((d) => {
            const selected = (value || devices[0]?.deviceId) === d.deviceId;
            return (
              <button
                key={`${label}-${d.deviceId}`}
                type="button"
                onClick={() => onPick(d.deviceId)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-minecraft-ten text-[11px] transition-colors"
                style={{
                  backgroundColor: selected ? `${accent}33` : "transparent",
                  color: selected ? "#fff" : "rgba(255,255,255,0.78)",
                  border: selected ? `1px solid ${accent}` : "1px solid transparent",
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selected ? accent : "rgba(255,255,255,0.25)" }}
                />
                <span className="truncate">{d.label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function GlobalCallOverlay() {
  const accent = useThemeStore((s) => s.accentColor.value);
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const isPixel = Boolean(activeAccount?.pixel_account);
  const call = useSocialCallStore((s) => s.call);
  const micLevel = useSocialCallStore((s) => s.micLevel);
  const cameraOn = useSocialCallStore((s) => s.cameraOn);
  const setCameraOn = useSocialCallStore((s) => s.setCameraOn);
  const localFrame = useSocialCallStore((s) => s.localFrame);
  const remoteFrame = useSocialCallStore((s) => s.remoteFrame);
  const localStream = useSocialCallStore((s) => s.cameraStream);
  const remoteStream = useSocialCallStore((s) => s.remoteStream);
  const minimized = useSocialCallStore((s) => s.callMinimized);
  const setMinimized = useSocialCallStore((s) => s.setCallMinimized);
  const audioInputs = useSocialCallStore((s) => s.audioInputs);
  const audioOutputs = useSocialCallStore((s) => s.audioOutputs);
  const videoInputs = useSocialCallStore((s) => s.videoInputs);
  const selectedMicId = useSocialCallStore((s) => s.selectedMicId);
  const selectedSpeakerId = useSocialCallStore((s) => s.selectedSpeakerId);
  const selectedCamId = useSocialCallStore((s) => s.selectedCamId);
  const setMediaDevices = useSocialCallStore((s) => s.setMediaDevices);
  const setSelectedMicId = useSocialCallStore((s) => s.setSelectedMicId);
  const setSelectedSpeakerId = useSocialCallStore((s) => s.setSelectedSpeakerId);
  const setSelectedCamId = useSocialCallStore((s) => s.setSelectedCamId);
  const [showDevices, setShowDevices] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const mediaStatus = useSocialCallStore((s) => s.mediaStatus);
  const elapsed = useElapsed(call?.state === "active" ? call.since : undefined);

  useSocialPoll();

  const refreshDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const all = await listMediaDevices();
      const inputs = all.filter((d) => d.kind === "audioinput");
      const outputs = all.filter((d) => d.kind === "audiooutput");
      const cameras = all.filter((d) => d.kind === "videoinput");
      setMediaDevices(inputs, outputs, cameras);

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/not allowed|permission|denied/i.test(msg)) {
        fail("El WebView bloqueó mic/cámara. Actualizá el launcher e intentá de nuevo.");
      } else {
        fail(e);
      }
    } finally {
      setLoadingDevices(false);
    }
  }, [setMediaDevices, setSelectedMicId, setSelectedSpeakerId, setSelectedCamId]);

  useEffect(() => {
    if (!call) return;
    void refreshDevices();
  }, [call?.id, refreshDevices]);

  useEffect(() => {
    if (showDevices) void refreshDevices();
  }, [showDevices, refreshDevices]);

  useEffect(() => {
    if (call) return;
    void webrtcCall.stop();
    setCameraOn(false);
    setMinimized(false);
    setShowDevices(false);
  }, [call, setCameraOn, setMinimized]);

  if (!CALLS_ENABLED || !isPixel || !call) return null;
  const name = call.peer.username;
  const ringingOut = call.state === "ringing" && call.direction === "out";
  const ringingIn = call.state === "ringing" && call.direction === "in";
  const active = call.state === "active";
  const speaking = active && !call.muted && micLevel > 0.02;
  const hasRemoteVideo = Boolean(remoteFrame || remoteStream?.getVideoTracks().some((t) => t.enabled && !t.muted && t.readyState === "live"));
  const hasLocalVideo = Boolean(localFrame || localStream?.getVideoTracks().some((t) => t.enabled && !t.muted && t.readyState === "live"));

  const status = ringingIn
    ? "Te está llamando…"
    : ringingOut
      ? "Llamando…"
      : call.audioError
        ? `Sin audio: ${call.audioError}`
        : call.peerMuted
          ? `${elapsed} · ${name} silenció su mic`
          : elapsed;

  const toggleMute = async () => {
    const next = !call.muted;
    try {
      await socialMute(next);
      await webrtcCall.setMuted(next);
    } catch (e) {
      fail(e);
    }
  };

  const toggleDeafen = async () => {
    const next = !call.deafened;
    try {
      await socialDeafen(next);
      await webrtcCall.setDeafened(next);
    } catch (e) {
      fail(e);
    }
  };

  const toggleCamera = async () => {
    const next = !cameraOn;
    setCameraOn(next);
    try {
      await webrtcCall.setCamera(next);
    } catch (e) {
      setCameraOn(false);
      fail(e);
    }
  };

  // Minimized Discord-like pill — call stays visible
  if (minimized && !ringingIn) {
    return (
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 px-3">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="pointer-events-auto pp-call-enter flex items-center gap-3 rounded-full border-2 bg-black/95 px-4 py-2 shadow-xl"
          style={{ borderColor: accent }}
          title="Abrir llamada"
        >
          <PlayerHeadshot playerName={name} size={28} alt={name} />
          <div className="text-left">
            <p className="font-minecraft text-base text-white lowercase leading-none">{name}</p>
            <p className="font-minecraft-ten text-[10px] text-white/50">{status}</p>
          </div>
          {!call.muted && (
            <div className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
              <div className="h-full" style={{ width: `${Math.min(100, micLevel * 400)}%`, backgroundColor: accent }} />
            </div>
          )}
          <Icon icon="solar:maximize-bold" className="h-4 w-4 text-white/70" />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />
      <div
        className="pointer-events-auto pp-call-enter relative flex w-full max-w-lg max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border-2 bg-[#0b0b10]/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        style={{ borderColor: accent }}
        role="dialog"
        aria-label={`Llamada con ${name}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-3 py-2" style={{ borderColor: `${accent}33` }}>
          <p className="font-minecraft-ten text-[10px] uppercase tracking-wide text-white/45">Voz · Video P2P</p>
          <button
            type="button"
            className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
            title="Minimizar (la llamada sigue)"
            onClick={() => setMinimized(true)}
          >
            <Icon icon="solar:minimize-bold" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-3 px-5 pb-3 pt-5">
          {/* Remote stage */}
          <div
            className={`pp-call-avatar relative flex h-32 w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl border-4 bg-black/50 ${speaking ? "pp-call-speaking" : ""}`}
            style={
              {
                borderColor: speaking ? accent : `${accent}55`,
                ["--pp-call-ring" as string]: accent,
              } as CSSProperties
            }
          >
            {hasRemoteVideo ? (
              remoteFrame ? <img src={remoteFrame} className="absolute inset-0 h-full w-full object-cover" alt="Cámara remota" /> : <StreamVideo stream={remoteStream} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <PlayerHeadshot playerName={name} size={96} alt={name} />
            )}
            {call.peerMuted && (
              <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white/80">
                <Icon icon="solar:microphone-3-bold" className="h-3 w-3 text-red-400" /> silenciado
              </span>
            )}
          </div>

          {/* Local PiP */}
          {hasLocalVideo && (
            <div className="absolute bottom-16 right-6 h-24 w-20 overflow-hidden rounded-lg border-2 border-white/30 bg-black shadow-lg">
              {localFrame ? <img src={localFrame} className="h-full w-full object-cover -scale-x-100" alt="Tu cámara" /> : <StreamVideo stream={localStream} mirror className="h-full w-full object-cover" />}
            </div>
          )}

          <div className="text-center">
            <p className="font-minecraft text-2xl lowercase text-white">
              {ringingIn ? "Llamada de " : ringingOut ? "Llamando a " : "Con "}
              <span className="font-bold" style={{ color: accent }}>
                {name}
              </span>
            </p>
            <p className="mt-1 font-minecraft-ten text-xs" style={{ color: call.audioError ? "#f87171" : "rgba(255,255,255,0.55)" }}>
              {status}
            </p>
          </div>

          {active && !call.muted && (
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10" title="Nivel de micrófono">
              <div className="h-full transition-[width] duration-100" style={{ width: `${Math.min(100, micLevel * 400)}%`, backgroundColor: accent }} />
            </div>
          )}
        </div>

        {showDevices && (
          <div className="space-y-3 border-t px-4 py-3" style={{ borderColor: `${accent}33` }}>
            <div className="flex items-center justify-between">
              <p className="font-minecraft-ten text-[10px] uppercase tracking-wide text-white/45">Dispositivos</p>
              <button
                type="button"
                onClick={() => void refreshDevices()}
                className="rounded px-2 py-0.5 font-minecraft-ten text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
                disabled={loadingDevices}
              >
                {loadingDevices ? "Buscando…" : "Actualizar"}
              </button>
            </div>

            {/* Live camera preview in settings */}
            <div className="overflow-hidden rounded-lg border border-white/15 bg-black">
              <div className="relative flex h-24 items-center justify-center">
                {hasLocalVideo ? (
                  localFrame ? <img src={localFrame} className="absolute inset-0 h-full w-full object-cover -scale-x-100" alt="Tu cámara" /> : <StreamVideo stream={localStream} mirror className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <p className="px-3 text-center font-minecraft-ten text-[11px] text-white/40">
                    Activá la cámara o elegí una abajo para ver el preview
                  </p>
                )}
              </div>
            </div>

            <DeviceList
              label="Cámara"
              devices={videoInputs}
              value={selectedCamId}
              accent={accent}
              emptyHint="Ninguna cámara detectada — revisá permisos del sistema"
              onPick={(id) => {
                setSelectedCamId(id);
                setCameraOn(true);
                void webrtcCall.switchCamera(id).catch((e) => {
                  setCameraOn(false);
                  fail(e);
                });
              }}
            />
            <DeviceList
              label="Micrófono"
              devices={[{ deviceId: "default", label: "Micrófono del sistema" }, ...audioInputs.filter((d) => d.deviceId !== "default")]}
              value={selectedMicId || "default"}
              accent={accent}
              emptyHint="Ningún micrófono — concedé permiso cuando el sistema lo pida"
              onPick={(id) => {
                setSelectedMicId(id);
                void webrtcCall.switchMic(id).catch(fail);
              }}
            />
            <DeviceList
              label="Salida de audio"
              devices={[{ deviceId: "default", label: "Salida del sistema" }, ...audioOutputs.filter((d) => d.deviceId !== "default")]}
              value={selectedSpeakerId || "default"}
              accent={accent}
              emptyHint="Usando salida predeterminada del sistema"
              onPick={(id) => {
                setSelectedSpeakerId(id);
                void webrtcCall.switchSpeaker(id).catch(fail);
              }}
            />
          </div>
        )}

        </div>
        <div className="shrink-0 border-t px-3 py-2" style={{ borderColor: `${accent}33` }}>
          <p className="text-center font-minecraft-ten text-[11px] text-white/65" role="status">{active ? mediaStatus : status}</p>
          {active && <div className="mt-1 flex justify-center gap-4">
            <button type="button" onClick={() => void webrtcCall.resumeAudio().catch(fail)} className="text-xs text-white/75 hover:text-white">Activar audio</button>
            <button type="button" onClick={() => void webrtcCall.restart().catch(fail)} className="text-xs text-white/75 hover:text-white">Reintentar conexión</button>
          </div>}
        </div>
        <div
          className="flex shrink-0 flex-wrap items-center justify-center gap-2.5 border-t px-4 py-3"
          style={{ borderColor: `${accent}33`, background: "rgba(0,0,0,0.45)" }}
        >
          {ringingIn ? (
            <>
              <button
                type="button"
                onClick={() => void socialAccept().catch(fail)}
                className="pp-call-ctrl flex h-12 min-w-[7rem] items-center justify-center gap-2 rounded-full border-2 border-emerald-400 bg-emerald-600 px-4 font-minecraft text-lg text-white"
              >
                <Icon icon="solar:phone-calling-bold" className="h-5 w-5" />
                Aceptar
              </button>
              <CallControl danger accent={accent} title="Rechazar" onClick={() => void socialHangup().catch(fail)}>
                <Icon icon="solar:phone-cross-bold" className="h-5 w-5" />
              </CallControl>
            </>
          ) : (
            <>
              <CallControl accent={accent} active={call.muted} title={call.muted ? "Activar mic" : "Silenciar"} onClick={() => void toggleMute()}>
                <Icon icon={call.muted ? "solar:microphone-3-bold" : "solar:microphone-bold"} className="h-5 w-5" />
              </CallControl>
              <CallControl accent={accent} active={call.deafened} title={call.deafened ? "Activar audio" : "Ensordecer"} onClick={() => void toggleDeafen()}>
                <Icon icon={call.deafened ? "solar:volume-cross-bold" : "solar:volume-loud-bold"} className="h-5 w-5" />
              </CallControl>
              <CallControl accent={accent} active={!cameraOn} title={cameraOn ? "Apagar cámara" : "Cámara"} onClick={() => void toggleCamera()}>
                <Icon icon={cameraOn ? "solar:videocamera-record-bold" : "solar:videocamera-bold"} className="h-5 w-5" />
              </CallControl>
              <CallControl accent={accent} active={showDevices} title="Dispositivos" onClick={() => setShowDevices((v) => !v)}>
                <Icon icon="solar:settings-bold" className="h-5 w-5" />
              </CallControl>
              <CallControl danger accent={accent} title={ringingOut ? "Cancelar" : "Colgar"} onClick={() => void socialHangup().catch(fail)}>
                <Icon icon="solar:phone-bold" className="h-5 w-5 rotate-[135deg]" />
              </CallControl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
