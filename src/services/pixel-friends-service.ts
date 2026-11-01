import { invoke } from "@tauri-apps/api/core";

export type PixelFriend = {
  uuid: string;
  username: string;
  kind?: string;
  rank?: string;
  rankLabel?: string;
  rankColor?: string;
  status?: string;
  statusAt?: number;
};

export type FriendsPayload = {
  me?: PixelFriend;
  friends: PixelFriend[];
  incoming: PixelFriend[];
  outgoing: PixelFriend[];
};

function asFriend(raw: unknown): PixelFriend | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const username = typeof obj.username === "string" ? obj.username : "";
  const uuid = typeof obj.uuid === "string" ? obj.uuid : "";
  if (!username && !uuid) {
    return null;
  }
  return {
    uuid,
    username,
    kind: typeof obj.kind === "string" ? obj.kind : undefined,
    rank: typeof obj.rank === "string" ? obj.rank : undefined,
    rankLabel: typeof obj.rankLabel === "string" ? obj.rankLabel : undefined,
    rankColor: typeof obj.rankColor === "string" ? obj.rankColor : undefined,
    status: typeof obj.status === "string" ? obj.status : undefined,
    statusAt: typeof obj.statusAt === "number" ? obj.statusAt : undefined,
  };
}

function asFriends(raw: unknown): PixelFriend[] {
  return Array.isArray(raw)
    ? raw.map(asFriend).filter((item): item is PixelFriend => item !== null)
    : [];
}

export async function listFriends(): Promise<FriendsPayload> {
  const raw = await invoke<Record<string, unknown>>("list_friends");
  return {
    me: asFriend(raw?.me) || undefined,
    friends: asFriends(raw?.friends),
    incoming: asFriends(raw?.incoming),
    outgoing: asFriends(raw?.outgoing),
  };
}

export async function addFriend(username: string): Promise<{
  friend: PixelFriend | null;
  pending?: boolean;
  accepted?: boolean;
}> {
  const raw = await invoke<Record<string, unknown>>("add_friend", { username });
  return {
    friend: asFriend(raw?.friend),
    pending: raw?.pending === true,
    accepted: raw?.accepted === true,
  };
}

export async function acceptFriend(username: string): Promise<PixelFriend | null> {
  const raw = await invoke<Record<string, unknown>>("accept_friend", { username });
  return asFriend(raw?.friend);
}

export async function declineFriend(username: string): Promise<void> {
  await invoke("decline_friend", { username });
}

export async function cancelFriend(username: string): Promise<void> {
  await invoke("cancel_friend", { username });
}

export async function removeFriend(username: string): Promise<void> {
  await invoke("remove_friend", { username });
}

export async function setPresence(status: string): Promise<{ status?: string }> {
  return invoke<{ status?: string }>("set_presence", { status });
}

export type ChatKind = "text" | "call_ended" | "call_missed" | "call_declined";

export type ChatMessage = {
  id: number | string;
  from: string;
  to: string;
  text: string;
  kind?: ChatKind;
  ts: number;
  read?: boolean;
  pending?: boolean;
  failed?: boolean;
  cid?: string;
};

export type CallPeer = {
  uuid?: string;
  username: string;
  rankLabel?: string;
  rankColor?: string;
};

export type CallState = {
  id: string;
  peer: CallPeer;
  direction: "in" | "out";
  state: "ringing" | "active";
  since?: number;
  muted: boolean;
  deafened: boolean;
  peerMuted: boolean;
  audioError?: string;
};

export type SocialStatus = { connected: boolean; user: string; call: CallState | null };

export const socialStatus = () => invoke<SocialStatus>("social_status");

export const socialSend = (to: string, text: string, cid: string) =>
  invoke("social_send", { to, text, cid });

export async function socialHistory(withUser: string, before?: number): Promise<ChatMessage[]> {
  const raw = await invoke<{ messages?: ChatMessage[] }>("social_history", { with: withUser, before: before ?? 0 });
  return Array.isArray(raw?.messages) ? raw.messages : [];
}

export async function socialUnread(): Promise<Record<string, number>> {
  const raw = await invoke<{ unread?: Record<string, number> }>("social_unread");
  return raw?.unread ?? {};
}

export const socialMarkRead = (withUser: string) => invoke("social_read", { with: withUser });
export const socialTyping = (to: string) => invoke("social_typing", { to });
export const socialCall = (to: string) => invoke("social_call", { to });
export const socialAccept = () => invoke("social_accept");
export const socialHangup = () => invoke("social_hangup");
export const socialMute = (muted: boolean) => invoke<CallState | null>("social_mute", { muted });
export const socialDeafen = (deafened: boolean) => invoke<CallState | null>("social_deafen", { deafened });
export const socialWebRTC = (payload: Record<string, unknown>) => invoke("social_webrtc", payload);
export const socialPcmFallback = () => invoke("social_pcm_fallback");
export const socialMicLevel = (level: number) => invoke("social_mic_level", { level });
