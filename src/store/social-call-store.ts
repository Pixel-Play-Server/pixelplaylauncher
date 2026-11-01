import { create } from "zustand";
import type { CallState, ChatMessage } from "../services/pixel-friends-service";

const key = (name: string) => name.toLowerCase();

type SocialState = {
  connected: boolean;
  me: string;
  call: CallState | null;
  micLevel: number;
  mediaStatus: string;
  setMediaStatus: (status: string) => void;
  /** Local camera preview (peer video still voice-only). */
  localFrame: string | null;
  remoteFrame: string | null;
  setFrame: (side: "local" | "remote", frame: string | null) => void;
  cameraOn: boolean;
  cameraStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callMinimized: boolean;
  audioInputs: { deviceId: string; label: string }[];
  audioOutputs: { deviceId: string; label: string }[];
  videoInputs: { deviceId: string; label: string }[];
  selectedMicId: string;
  selectedSpeakerId: string;
  selectedCamId: string;
  activeChatUsername: string | null;
  chats: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  typing: Record<string, number>;

  setConnected: (connected: boolean, me?: string) => void;
  setCall: (call: CallState | null) => void;
  setMicLevel: (level: number) => void;
  setCameraOn: (on: boolean) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setCallMinimized: (v: boolean) => void;
  setMediaDevices: (
    inputs: { deviceId: string; label: string }[],
    outputs: { deviceId: string; label: string }[],
    cameras: { deviceId: string; label: string }[],
  ) => void;
  setSelectedMicId: (id: string) => void;
  setSelectedSpeakerId: (id: string) => void;
  setSelectedCamId: (id: string) => void;
  setActiveChatUsername: (username: string | null) => void;
  setHistory: (withUser: string, messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage, peer: string) => void;
  resolvePending: (cid: string, msg: ChatMessage | null, peer: string) => void;
  setUnread: (unread: Record<string, number>) => void;
  bumpUnread: (from: string) => void;
  clearUnread: (withUser: string) => void;
  setTyping: (from: string) => void;
};

export const useSocialCallStore = create<SocialState>((set) => ({
  connected: false,
  me: "",
  call: null,
  micLevel: 0,
  mediaStatus: "Conectando audio directo…",
  setMediaStatus: (mediaStatus) => set({ mediaStatus }),
  localFrame: null, remoteFrame: null,
  setFrame: (side, frame) => set(side === "local" ? { localFrame: frame } : { remoteFrame: frame }),
  cameraOn: false,
  cameraStream: null,
  remoteStream: null,
  callMinimized: false,
  audioInputs: [],
  audioOutputs: [],
  videoInputs: [],
  selectedMicId: "",
  selectedSpeakerId: "",
  selectedCamId: "",
  activeChatUsername: null,
  chats: {},
  unread: {},
  typing: {},

  setConnected: (connected, me) => set((s) => ({ connected, me: me ?? s.me })),
  setCall: (call) =>
    set((s) => ({
      call,
      micLevel: call ? s.micLevel : 0,
      callMinimized: call ? s.callMinimized : false,
      localFrame: call ? s.localFrame : null,
      remoteFrame: call ? s.remoteFrame : null,
      remoteStream: call ? s.remoteStream : null,
    })),
  setMicLevel: (micLevel) => set({ micLevel }),
  setCameraOn: (cameraOn) => set({ cameraOn }),
  setCameraStream: (cameraStream) => set({ cameraStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setCallMinimized: (callMinimized) => set({ callMinimized }),
  setMediaDevices: (audioInputs, audioOutputs, videoInputs) =>
    set({ audioInputs, audioOutputs, videoInputs }),
  setSelectedMicId: (selectedMicId) => set({ selectedMicId }),
  setSelectedSpeakerId: (selectedSpeakerId) => set({ selectedSpeakerId }),
  setSelectedCamId: (selectedCamId) => set({ selectedCamId }),
  setActiveChatUsername: (username) => set({ activeChatUsername: username }),
  setHistory: (withUser, messages) =>
    set((s) => {
      const pending = (s.chats[key(withUser)] ?? []).filter((m) => m.pending || m.failed);
      return { chats: { ...s.chats, [key(withUser)]: [...messages, ...pending] } };
    }),
  addMessage: (msg, peer) =>
    set((s) => {
      const list = s.chats[key(peer)] ?? [];
      if (list.some((m) => m.id === msg.id && !m.pending)) return s;
      return { chats: { ...s.chats, [key(peer)]: [...list, msg] } };
    }),
  resolvePending: (cid, msg, peer) =>
    set((s) => {
      const list = s.chats[key(peer)] ?? [];
      const next = list.map((m) =>
        m.cid === cid ? (msg ? { ...msg, cid } : { ...m, pending: false, failed: true }) : m,
      );
      return { chats: { ...s.chats, [key(peer)]: next } };
    }),
  setUnread: (unread) =>
    set({ unread: Object.fromEntries(Object.entries(unread).map(([k, v]) => [key(k), v])) }),
  bumpUnread: (from) =>
    set((s) => ({ unread: { ...s.unread, [key(from)]: (s.unread[key(from)] ?? 0) + 1 } })),
  clearUnread: (withUser) =>
    set((s) => {
      if (!s.unread[key(withUser)]) return s;
      const next = { ...s.unread };
      delete next[key(withUser)];
      return { unread: next };
    }),
  setTyping: (from) => set((s) => ({ typing: { ...s.typing, [key(from)]: Date.now() } })),
}));

export const chatKey = key;

export const totalUnread = (unread: Record<string, number>) =>
  Object.values(unread).reduce((a, b) => a + b, 0);
