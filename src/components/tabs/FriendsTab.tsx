"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useThemeStore } from "../../store/useThemeStore";
import { useSocialCallStore } from "../../store/social-call-store";
import { setVisibleInterval } from "../../lib/visible-interval";
import { Button } from "../ui/buttons/Button";
import { Input } from "../ui/Input";
import { PlayerHeadshot } from "../account/PlayerHeadshot";
import {
  acceptFriend,
  addFriend,
  cancelFriend,
  declineFriend,
  listFriends,
  removeFriend,
  socialHistory,
  socialMarkRead,
  socialSend,
  socialTyping,
  type PixelFriend,
  type ChatMessage,
} from "../../services/pixel-friends-service";
import { chatKey } from "../../store/social-call-store";
import { presenceInfo } from "../../lib/pixel-rank";

export function FriendsTab() {
  const { t } = useTranslation();
  const accent = useThemeStore((s) => s.accentColor.value);
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const isPixel = Boolean(activeAccount?.pixel_account);
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<PixelFriend[]>([]);
  const [incoming, setIncoming] = useState<PixelFriend[]>([]);
  const [outgoing, setOutgoing] = useState<PixelFriend[]>([]);
  const [me, setMe] = useState<PixelFriend | undefined>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [section, setSection] = useState<"friends" | "requests">("friends");
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const refreshGeneration = useRef(0);
  const sessionID = activeAccount?.id;
  const sessionIsCurrent = () => useMinecraftAuthStore.getState().activeAccount?.id === sessionID;
  useEffect(() => {
    setFriends([]); setIncoming([]); setOutgoing([]); setMe(undefined);
    setActiveChatFriend(null); setChatInput(""); setListError(null);
    return () => { refreshGeneration.current++; };
  }, [sessionID]);

  const chatOwner = useRef<string | undefined>();
  const [activeChatFriend, setActiveChatFriend] = useState<PixelFriend | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const lastTypingSent = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const setActiveChatUsername = useSocialCallStore((s) => s.setActiveChatUsername);
  const connected = useSocialCallStore((s) => s.connected);
  const myName = useSocialCallStore((s) => s.me);
  const unread = useSocialCallStore((s) => s.unread);
  const chatMessages = useSocialCallStore((s) =>
    activeChatFriend ? s.chats[chatKey(activeChatFriend.username)] : undefined,
  );
  const peerTypingAt = useSocialCallStore((s) =>
    activeChatFriend ? s.typing[chatKey(activeChatFriend.username)] : undefined,
  );
  const [, forceTick] = useState(0);
  const peerTyping = peerTypingAt !== undefined && Date.now() - peerTypingAt < 4000;

  useEffect(() => {
    if (!peerTypingAt) return;
    const id = window.setTimeout(() => forceTick((n) => n + 1), 4100);
    return () => clearTimeout(id);
  }, [peerTypingAt]);

  useEffect(() => {
    setActiveChatUsername(activeChatFriend?.username ?? null);
    return () => setActiveChatUsername(null);
  }, [activeChatFriend, setActiveChatUsername]);

  useEffect(() => {
    if (!isPixel || !activeChatFriend || chatOwner.current !== sessionID) return;
    const name = activeChatFriend.username;
    let disposed = false;
    setHistoryLoading(true);
    setHistoryError(null);
    void socialHistory(name)
      .then((history) => { if (!disposed && sessionIsCurrent()) useSocialCallStore.getState().setHistory(name, history); })
      .catch((err) => { if (!disposed && sessionIsCurrent()) setHistoryError(String(err instanceof Error ? err.message : err)); })
      .finally(() => { if (!disposed && sessionIsCurrent()) setHistoryLoading(false); });
    if (!document.hidden && document.hasFocus()) {
      void socialMarkRead(name).then(() => {
        if (!disposed && sessionIsCurrent()) useSocialCallStore.getState().clearUnread(name);
      }).catch(() => undefined);
    }
    return () => { disposed = true; };
  }, [activeChatFriend?.username, connected, sessionID]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [chatMessages?.length, peerTyping]);

  const refresh = useCallback(async () => {
    if (!isPixel) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      setMe(undefined);
      return;
    }
    const generation = ++refreshGeneration.current;
    setLoading(true);
    try {
      const out = await listFriends();
      if (generation !== refreshGeneration.current || !sessionIsCurrent()) return;
      setListError(null);
      setFriends(out.friends);
      setIncoming(out.incoming);
      setOutgoing(out.outgoing);
      setMe(out.me);
    } catch (err) {
      if (generation === refreshGeneration.current && sessionIsCurrent()) setListError(err instanceof Error ? err.message : String(err));
    } finally {
      if (generation === refreshGeneration.current && sessionIsCurrent()) setLoading(false);
    }
  }, [isPixel, sessionID]);

  useEffect(() => {
    void refresh();
    if (!isPixel) return;
    return setVisibleInterval(refresh, 15000);
  }, [isPixel, refresh]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    if (busy) return;
    const name = query.trim();
    if (!name) {
      toast.error(t("friends.nameRequired"));
      return;
    }
    setBusy(true);
    try {
      const out = await addFriend(name);
      setQuery("");
      toast.success(
        out.accepted
          ? t("friends.added", { name })
          : t("friends.requested", { name }),
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const sendText = async (friendName: string, text: string, retryCid?: string) => {
    const store = useSocialCallStore.getState();
    const cid = retryCid ?? `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    if (retryCid) {
      store.retryMessage(friendName, retryCid);
    } else store.addMessage(
      { id: cid, cid, from: myName || activeAccount?.username || "", to: friendName, text, ts: Date.now(), pending: true },
      friendName,
    );
    try {
      await socialSend(friendName, text, cid);
    } catch (err) {
      if (!sessionIsCurrent()) return;
      store.resolvePending(cid, null, friendName);
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    }
  };

  const handleSendMessage = () => {
    if (!connected || !activeChatFriend || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    void sendText(activeChatFriend.username, text);
  };

  const handleTyping = (value: string) => {
    setChatInput(value);
    if (!activeChatFriend || !value || Date.now() - lastTypingSent.current < 2500) return;
    lastTypingSent.current = Date.now();
    void socialTyping(activeChatFriend.username).catch(() => undefined);
  };


  if (!isPixel) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-3">
          <Icon icon="solar:users-group-rounded-bold" className="w-16 h-16 mx-auto text-white/40" />
          <h2 className="font-minecraft text-4xl text-white normal-case">
            {t("friends.title")}
          </h2>
          <p className="text-white/70 font-minecraft-ten text-sm">
            {t("friends.pixelOnly")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-minecraft-ten text-xl text-white">{t("friends.title")}</h2>
        <span className={`text-xs font-minecraft-ten ${connected ? "text-emerald-400" : "text-amber-300"}`}>{connected ? "Chat conectado" : "Chat desconectado"}</span>
      </div>
      {listError && <div role="alert" className="flex items-center gap-3 p-3 mb-3 border border-red-500/30 bg-red-500/10 rounded text-xs text-red-200"><span className="flex-1">{listError}</span><Button size="sm" variant="ghost" disabled={loading} onClick={() => void refresh()}>Reintentar</Button></div>}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className={`${activeChatFriend ? "hidden md:block" : ""} w-full md:w-[340px] lg:w-[380px] md:shrink-0 overflow-y-auto custom-scrollbar space-y-4 pr-1`}>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSection("friends")} className={`flex-1 rounded px-3 py-2 text-xs font-minecraft-ten ${section === "friends" ? "bg-white/10 text-white" : "text-white/45"}`}>Amigos · {friends.length}</button>
            <button type="button" onClick={() => setSection("requests")} className={`flex-1 rounded px-3 py-2 text-xs font-minecraft-ten ${section === "requests" ? "bg-white/10 text-white" : "text-white/45"}`}>Solicitudes · {incoming.length + outgoing.length}</button>
            <button type="button" aria-label="Agregar amigo" title="Agregar amigo" onClick={() => setShowAdd(v => !v)} className="p-2 rounded border border-white/10 text-white/70"><Icon icon="solar:user-plus-linear" className="w-5 h-5" /></button>
          </div>
          {section === "friends" && <Input aria-label="Buscar amigos" placeholder="Buscar amigos…" value={filter} onChange={e => setFilter(e.target.value)} />}
          {showAdd && (
          <div
            className="p-4 rounded-md border"
            style={{ backgroundColor: "#121212cc", borderColor: `${accent}55` }}
          >
            <p className="text-white/70 font-minecraft-ten text-sm mb-3">
              {t("friends.addHint")}
            </p>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("friends.username")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
              />
              <Button variant="success" onClick={() => void handleAdd()} disabled={busy}>
                {busy ? t("common.loading") : t("friends.add")}
              </Button>
            </div>
          </div>

          )}
          {section === "requests" && <>
          <RequestSection
            title={t("friends.incoming")}
            empty={t("friends.incomingEmpty")}
            items={incoming}
            loading={loading}
            render={(friend) => (
              <FriendRow
                key={friend.uuid || friend.username}
                friend={friend}
                busy={busy}
                onAccept={() =>
                  void run(
                    () => acceptFriend(friend.username),
                    t("friends.accepted", { name: friend.username }),
                  )
                }
                onDecline={() =>
                  void run(
                    () => declineFriend(friend.username),
                    t("friends.declined", { name: friend.username }),
                  )
                }
              />
            )}
          />

          <RequestSection
            title={t("friends.outgoing")}
            empty={t("friends.outgoingEmpty")}
            items={outgoing}
            loading={loading}
            render={(friend) => (
              <FriendRow
                key={friend.uuid || friend.username}
                friend={friend}
                pending
                busy={busy}
                onCancel={() =>
                  void run(
                    () => cancelFriend(friend.username),
                    t("friends.cancelled", { name: friend.username }),
                  )
                }
              />
            )}
          />

          </>}
          {section === "friends" && <div className="space-y-2">
            {loading && friends.length === 0 ? (
              <p className="text-white/60 font-minecraft-ten text-sm">{t("friends.loading")}</p>
            ) : friends.length === 0 ? (
              <p className="text-white/55 font-minecraft-ten text-sm">{t("friends.empty")}</p>
            ) : (
              friends.filter(friend => friend.username.toLowerCase().includes(filter.toLowerCase())).map((friend) => (
                <FriendRow
                  key={friend.uuid || friend.username}
                  friend={friend}
                  unread={unread[chatKey(friend.username)] ?? 0}
                  active={activeChatFriend?.username === friend.username}
                  onChat={() => { chatOwner.current = sessionID; setActiveChatFriend(friend); }}
                  onRemove={() =>
                    void run(
                      async () => { await removeFriend(friend.username); if (activeChatFriend?.username === friend.username) setActiveChatFriend(null); },
                      t("friends.removed", { name: friend.username }),
                    )
                  }
                  busy={busy}
                />
              ))
            )}
          </div>}
        </div>

        {activeChatFriend && (
          <div
            className="flex-1 min-w-0 border rounded-lg p-4 flex flex-col bg-black/25 min-h-0"
            style={{ borderColor: `${accent}80` }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-white/5">
                  <PlayerHeadshot playerName={activeChatFriend.username} size={32} alt={activeChatFriend.username} />
                </div>
                <span className="font-minecraft-ten text-sm text-white truncate">
                  {activeChatFriend.username}
                </span>
              </div>
              <Button aria-label="Cerrar conversación" variant="ghost" size="sm" onClick={() => setActiveChatFriend(null)}>
                <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-3 pr-1 min-h-0">
              {historyError && <p role="alert" className="text-xs text-red-300 p-2">{historyError}</p>}
              {!connected && (
                <p className="text-[11px] font-minecraft-ten text-amber-300/90 text-center py-1">
                  Reconectando con el servidor de chat…
                </p>
              )}
              {historyLoading && !chatMessages?.length ? (
                <p className="text-xs font-minecraft-ten text-white/40 text-center py-8">Cargando mensajes…</p>
              ) : !chatMessages?.length ? (
                <p className="text-xs font-minecraft-ten text-white/40 text-center py-8">
                  No hay mensajes. Escribí el primero.
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <ChatBubble
                    key={msg.cid ?? msg.id}
                    msg={msg}
                    mine={msg.from.toLowerCase() === (myName || activeAccount?.username || "").toLowerCase()}
                    accent={accent}
                    onRetry={() => void sendText(activeChatFriend.username, msg.text, msg.cid)}
                  />
                ))
              )}
              {peerTyping && (
                <p className="text-[11px] font-minecraft-ten text-white/50 pl-1">
                  {activeChatFriend.username} está escribiendo…
                </p>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10 items-center">
              <Input
                value={chatInput}
                onChange={(e) => handleTyping(e.target.value)}
                aria-label="Mensaje" disabled={!connected} placeholder={connected ? "Escribe un mensaje…" : "Esperando conexión…"}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
              />
              <Button variant="success" size="sm" aria-label="Enviar mensaje" onClick={handleSendMessage} disabled={!connected || !chatInput.trim()}>
                <Icon icon="solar:plain-bold" className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        {!activeChatFriend && <div className="hidden md:flex flex-1 rounded-lg border border-white/10 bg-black/20 items-center justify-center text-center p-8">
          <div className="space-y-3 text-white/40"><Icon icon="solar:chat-round-dots-linear" className="w-12 h-12 mx-auto" /><p className="font-minecraft-ten text-sm">Selecciona un amigo para conversar</p></div>
        </div>}
      </div>
    </div>
  );
}

function ChatBubble({
  msg,
  mine,
  accent,
  onRetry,
}: {
  msg: ChatMessage;
  mine: boolean;
  accent: string;
  onRetry: () => void;
}) {
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (msg.kind && msg.kind !== "text") {
    const icon =
      msg.kind === "call_ended" ? "solar:phone-calling-bold" : msg.kind === "call_declined" ? "solar:phone-cross-bold" : "solar:missed-call-bold";
    return (
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-minecraft-ten text-white/60">
          <Icon icon={icon} className="w-3.5 h-3.5" />
          {msg.text} · {time}
        </span>
      </div>
    );
  }
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-2.5 py-1.5 rounded-lg max-w-[85%] text-xs font-minecraft-ten border ${
          mine ? "rounded-br-sm text-white" : "rounded-bl-sm bg-white/10 text-white/90 border-white/10"
        } ${msg.pending ? "opacity-60" : ""}`}
        style={mine ? { backgroundColor: `${accent}cc`, borderColor: `${accent}` } : undefined}
      >
        <p className="break-words whitespace-pre-wrap">{msg.text}</p>
        <div className="flex justify-end items-center gap-1 text-[10px] text-white/55 mt-0.5">
          {msg.failed ? (
            <button type="button" className="text-red-300 underline" onClick={onRetry}>
              No enviado · reintentar
            </button>
          ) : (
            <>
              <span>{time}</span>
              {mine && <span aria-label={msg.pending ? "Enviando" : msg.read ? "Leído" : "Enviado"} title={msg.pending ? "Enviando" : msg.read ? "Leído" : "Enviado"}><Icon icon={msg.pending ? "solar:clock-circle-linear" : msg.read ? "solar:check-read-linear" : "solar:check-linear"} className="w-3 h-3" /></span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestSection({
  title,
  empty,
  items,
  loading,
  render,
}: {
  title: string;
  empty: string;
  items: PixelFriend[];
  loading: boolean;
  render: (friend: PixelFriend) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-minecraft-ten text-sm text-white/70">{title}</h3>
      {loading && items.length === 0 ? null : items.length === 0 ? (
        <p className="text-white/45 font-minecraft-ten text-sm">{empty}</p>
      ) : (
        items.map(render)
      )}
    </div>
  );
}

function FriendRow({
  friend,
  self,
  pending,
  onChat,
  onRemove,
  onAccept,
  onDecline,
  onCancel,
  busy,
  unread = 0,
  active,
}: {
  friend: PixelFriend;
  unread?: number;
  active?: boolean;
  self?: boolean;
  pending?: boolean;
  onChat?: () => void;
  onRemove?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const status = presenceInfo(friend.status || (self ? "online" : "offline"));
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-md border"
      style={{
        backgroundColor: active ? "#161616e6" : "#0a0a0acc",
        borderColor: active ? "#059669" : "rgba(255,255,255,0.10)",
      }}
    >
      <div className="relative w-10 h-10 flex-shrink-0">
        <div
          className="w-10 h-10 overflow-hidden rounded-sm border-2"
          style={{ borderColor: friend.rankColor || "#059669" }}
        >
          <PlayerHeadshot playerName={friend.username} size={40} alt={friend.username} />
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-black"
          style={{ backgroundColor: pending ? "#fbbf24" : status.color }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="font-minecraft-ten text-sm text-white truncate">
            {friend.username}
          </span>

        </div>
        <p
          className="text-[11px] font-minecraft-ten uppercase tracking-wide"
          style={{ color: pending ? "#fbbf24" : status.color }}
        >
          {pending ? t("friends.pending") : t(`friends.status.${status.key}`)}
          {self ? ` · ${t("friends.you")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {unread > 0 && (
          <span className="pp-call-enter min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-600 border border-red-400 text-white font-minecraft text-sm flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {!self && !pending && onChat && (
          <Button aria-label={`Chat con ${friend.username}`} className="!px-2 !min-w-0" variant="secondary" size="sm" onClick={onChat} disabled={busy} title="Chat">
            <Icon icon="solar:chat-round-dots-bold" className="w-4 h-4" />
          </Button>
        )}
        {onAccept && (
          <Button variant="success" size="sm" onClick={onAccept} disabled={busy}>
            {t("friends.accept")}
          </Button>
        )}
        {onDecline && (
          <Button variant="ghost" size="sm" onClick={onDecline} disabled={busy}>
            {t("friends.decline")}
          </Button>
        )}
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            {t("friends.cancel")}
          </Button>
        )}
        {!self && onRemove && (
          <Button aria-label={`Eliminar a ${friend.username}`} className="!px-2 !min-w-0" variant="ghost" size="sm" onClick={onRemove} disabled={busy} title={t("friends.remove")}>
            <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
