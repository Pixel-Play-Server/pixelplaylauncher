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
  by?: string;
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
    const st = useSocialCallStore.getState;
    st().resetSession();
    if (!isPixel) return;
    let disposed = false;
    const sessionID = activeAccount?.id;
    const currentSession = () => !disposed && useMinecraftAuthStore.getState().activeAccount?.id === sessionID;
    const fetchUnread = () => socialUnread().then(u => { if (currentSession()) st().setUnread(u); }).catch(() => undefined);
    bindWebRTCHandlers();

    void socialStatus()
      .then((s) => {
        if (!currentSession()) return;
        st().setConnected(s.connected, s.user);
        st().setCall(s.call);
        void startWebRTCIfNeeded(s.call).catch(() => undefined);
      })
      .catch(() => undefined);
    void fetchUnread();

    const markVisibleChatRead = () => {
      const peer = st().activeChatUsername;
      if (currentSession() && windowActive() && peer) void socialMarkRead(peer).then(() => { if (currentSession()) st().clearUnread(peer); }).catch(() => undefined);
    };
    window.addEventListener("focus", markVisibleChatRead);
    document.addEventListener("visibilitychange", markVisibleChatRead);
    const offs: Array<() => void> = [];
    const on = <T,>(name: string, fn: (payload: T) => void) => {
      void listen<T>(name, (e) => { if (currentSession()) fn(e.payload); }).then((off) => (disposed ? off() : offs.push(off)));
    };

    on<Parameters<typeof webrtcCall.handleNativeMedia>[0]>("social_native_media", (ev) => webrtcCall.handleNativeMedia(ev));

    on<SocialEvent>("social_event", (ev) => {
      const me = st().me.toLowerCase();
      switch (ev.t) {
        case "status":
          st().setConnected(Boolean(ev.connected), ev.user);
          if (ev.connected) void fetchUnread();
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
          const duplicate = (st().chats[chatKey(peer)] ?? []).some(existing => existing.id === m.id && !existing.pending);
          const cid = ev.cid || m.cid;
          if (cid) st().resolvePending(cid, m, peer);
          else st().addMessage(m, peer);
          if (mine || duplicate) return;
          const open = st().activeChatUsername && chatKey(st().activeChatUsername!) === chatKey(m.from);
          if (open && windowActive()) {
            void socialMarkRead(m.from).then(() => { if (currentSession()) st().clearUnread(m.from); }).catch(() => undefined);
            return;
          }
          st().bumpUnread(m.from);
          if (m.kind === "text" || !m.kind) {
            if (!open && windowActive()) toast(`💬 ${m.from}: ${m.text}`, { duration: 4000 });
            if (!windowActive()) void desktopNotify(`Mensaje de ${m.from}`, m.text.slice(0, 140));
          }
          break;
        }
        case "error": {
          if (ev.cid) {
            for (const [peer, messages] of Object.entries(st().chats)) {
              if (messages.some(m => m.cid === ev.cid)) st().resolvePending(ev.cid, null, peer);
            }
          }
          if (ev.error) toast.error(ev.error, { id: ev.cid ? `social-error-${ev.cid}` : "social-error" });
          break;
        }
        case "read":
          if (ev.with) st().clearUnread(ev.with);
          break;
        case "seen":
          if (ev.by) st().markSeen(ev.by);
          break;
        case "typing": {
          const from =
            typeof ev.from === "string" ? ev.from : (ev.from as { username?: string } | undefined)?.username;
          if (from) st().setTyping(from);
          break;
        }
        case "call": {
          if (!CALLS_ENABLED) break;
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
      window.removeEventListener("focus", markVisibleChatRead);
      document.removeEventListener("visibilitychange", markVisibleChatRead);
      offs.forEach((off) => off());
      st().resetSession();
      void webrtcCall.stop();
    };
  }, [isPixel, activeAccount?.id]);
}
