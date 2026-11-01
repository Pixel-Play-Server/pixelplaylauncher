import { CALLS_ENABLED } from "../services/call-features";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { toast } from "react-hot-toast";
import { useMinecraftAuthStore } from "../store/minecraft-auth-store";
import { chatKey, useSocialCallStore } from "../store/social-call-store";
import {
  socialMarkRead,
  socialStatus,
  socialUnread,
  type CallState,
  type ChatMessage,
} from "../services/pixel-friends-service";
import { desktopNotify } from "../services/desktop-notify";
import { webrtcCall } from "../services/webrtc-call";

type SocialEvent = {
  t: string;
  m?: ChatMessage;
  cid?: string;
  error?: string;
  action?: string;
  from?: string | { username?: string };
  connected?: boolean;
  user?: string;
  reason?: string;
  with?: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  call?: CallState | string;
};

const windowActive = () => !document.hidden && document.hasFocus();

function bindWebRTCHandlers() {
  const st = useSocialCallStore.getState;
  webrtcCall.configure({
    onFrame: (side, frame) => useSocialCallStore.getState().setFrame(side, frame),
    onLocalStream: (s) => st().setCameraStream(s),
    onRemoteStream: (s) => st().setRemoteStream(s),
    onMicLevel: (level) => st().setMicLevel(level),
    onError: (msg) => { st().setMediaStatus(msg); toast.error(msg); },
    onMicDevice: (id) => st().setSelectedMicId(id),
    onStatus: (status) => st().setMediaStatus(status),
  });
}

async function startWebRTCIfNeeded(call: CallState | null) {
  if (!CALLS_ENABLED || !call || call.state !== "active") {
    await webrtcCall.stop();
    return;
  }
  bindWebRTCHandlers();
  const s = useSocialCallStore.getState();
  webrtcCall.setDevices(s.selectedMicId, s.selectedSpeakerId, s.selectedCamId);
  await webrtcCall.start(call, s.cameraOn);
}

/** Live chat/call events pushed by the Go social client (no polling). */
export function useSocialPoll() {
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const isPixel = Boolean(activeAccount?.pixel_account);

  useEffect(() => {
    if (!isPixel) return;
    const st = useSocialCallStore.getState;
    bindWebRTCHandlers();

    void socialStatus()
      .then((s) => {
        st().setConnected(s.connected, s.user);
        st().setCall(s.call);
        void startWebRTCIfNeeded(s.call).catch(() => undefined);
      })
      .catch(() => undefined);
    void socialUnread().then((u) => st().setUnread(u)).catch(() => undefined);

    const offs: Array<() => void> = [];
    let disposed = false;
    const on = <T,>(name: string, fn: (payload: T) => void) => {
      void listen<T>(name, (e) => fn(e.payload)).then((off) => (disposed ? off() : offs.push(off)));
    };

    on<Parameters<typeof webrtcCall.handleNativeMedia>[0]>("social_native_media", (ev) => webrtcCall.handleNativeMedia(ev));

    on<SocialEvent>("social_event", (ev) => {
      const me = st().me.toLowerCase();
      switch (ev.t) {
        case "status":
          st().setConnected(Boolean(ev.connected), ev.user);
          if (ev.connected) void socialUnread().then((u) => st().setUnread(u)).catch(() => undefined);
          break;
        case "hello":
          st().setConnected(true, (ev as { me?: { username?: string } }).me?.username);
          break;
        case "webrtc":
          if (ev.action === "start") {
            const call = typeof ev.call === "object" && ev.call ? ev.call : st().call;
            void startWebRTCIfNeeded(call).catch(() => undefined);
          } else if (ev.action === "prefer-pcm") {
            st().setMediaStatus("El otro launcher requiere una actualización para conectar por WebRTC");
          } else {
            void webrtcCall.handleSignal(ev).catch(() => undefined);
          }
          break;
        case "msg": {
          const m = ev.m;
          if (!m) return;
          const mine = m.from.toLowerCase() === me;
          const peer = mine ? m.to : m.from;
          if (ev.cid) st().resolvePending(ev.cid, m, peer);
          else st().addMessage(m, peer);
          if (mine) return;
          const open = st().activeChatUsername && chatKey(st().activeChatUsername!) === chatKey(m.from);
          if (open && windowActive()) {
            void socialMarkRead(m.from).catch(() => undefined);
            return;
          }
          st().bumpUnread(m.from);
          if (m.kind === "text" || !m.kind) {
            if (!open) toast(`💬 ${m.from}: ${m.text}`, { duration: 4000 });
            if (!windowActive()) void desktopNotify(`Mensaje de ${m.from}`, m.text.slice(0, 140));
          }
          break;
        }
        case "typing": {
          const from =
            typeof ev.from === "string" ? ev.from : (ev.from as { username?: string } | undefined)?.username;
          if (from) st().setTyping(from);
          break;
        }
        case "call": {
          const fromName =
            typeof ev.from === "string"
              ? ev.from
              : (ev.from as { username?: string } | undefined)?.username ?? "";
          if (ev.action === "invite" && fromName) {
            toast.success(`📞 ${fromName} te está llamando`, { duration: 6000 });
            void desktopNotify("Llamada entrante", `${fromName} te está llamando`);
          } else if (ev.action === "busy") {
            toast.error("Está en otra llamada");
          } else if (ev.action === "unavailable") {
            toast.error("No está conectado ahora — le quedó una llamada perdida");
          } else if (ev.action === "failed" && ev.error) {
            toast.error(ev.error);
          } else if (ev.action === "ended") {
            void webrtcCall.stop();
            const reason: Record<string, string> = {
              decline: "Llamada rechazada",
              missed: "No contestó",
              cancelled: "Llamada cancelada",
              disconnected: "Se cortó la llamada",
            };
            toast(reason[ev.reason ?? ""] ?? "Llamada finalizada", { icon: "📴" });
          }
          break;
        }
      }
    });

    on<CallState | null>("social_call", (call) => {
      st().setCall(call);
      void startWebRTCIfNeeded(call).catch(() => undefined);
    });
    on<{ mic?: number }>("social_voice_level", (p) => st().setMicLevel(p.mic ?? 0));

    return () => {
      disposed = true;
      offs.forEach((off) => off());
      void webrtcCall.stop();
    };
  }, [isPixel, activeAccount?.id]);
}
