import { create } from "zustand";
import type { PresenceStatus } from "../lib/pixel-rank";

type PresenceState = {
  status: PresenceStatus;
  setStatus: (status: string) => void;
};

export const usePresenceStore = create<PresenceState>((set) => ({
  status: "online",
  setStatus: (status) => {
    const key = status.toLowerCase();
    if (key === "ingame" || key === "idle" || key === "offline" || key === "online") {
      set({ status: key });
      return;
    }
    set({ status: "online" });
  },
}));
