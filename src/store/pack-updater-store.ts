import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type PackUpdaterStatus = {
  has_updater: boolean;
  current: string;
  remote: string;
  updated: boolean | null;
  fetchedAt: number;
};

type RemoteStatus = {
  has_updater?: boolean;
  current?: string;
  remote?: string;
  updated?: boolean | null;
};

const inflight = new Map<string, Promise<void>>();
const CACHE_MS = 45_000;

interface PackUpdaterState {
  byId: Record<string, PackUpdaterStatus>;
  ensure: (packId: string) => Promise<void>;
  markAvailable: (packId: string, from?: string, to?: string) => void;
  markUpdated: (packId: string, to?: string) => void;
}

function emptyStatus(): PackUpdaterStatus {
  return {
    has_updater: false,
    current: "",
    remote: "",
    updated: null,
    fetchedAt: 0,
  };
}

export const usePackUpdaterStore = create<PackUpdaterState>((set, get) => ({
  byId: {},

  ensure: async (packId) => {
    const id = (packId || "").trim();
    if (!id) return;
    const cached = get().byId[id];
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
      return;
    }
    const pending = inflight.get(id);
    if (pending) {
      await pending;
      return;
    }
    const run = (async () => {
      try {
        const res = await invoke<RemoteStatus>("modpack_updater_status", {
          packId: id,
        });
        set((state) => ({
          byId: {
            ...state.byId,
            [id]: {
              has_updater: !!res?.has_updater,
              current: res?.current || "",
              remote: res?.remote || "",
              updated:
                typeof res?.updated === "boolean" ? res.updated : null,
              fetchedAt: Date.now(),
            },
          },
        }));
      } catch {
        set((state) => ({
          byId: {
            ...state.byId,
            [id]: {
              ...emptyStatus(),
              current: cached?.current || "",
              fetchedAt: Date.now(),
            },
          },
        }));
      } finally {
        inflight.delete(id);
      }
    })();
    inflight.set(id, run);
    await run;
  },

  markAvailable: (packId, from, to) => {
    const id = (packId || "").trim();
    if (!id) return;
    const prev = get().byId[id] || emptyStatus();
    set((state) => ({
      byId: {
        ...state.byId,
        [id]: {
          has_updater: true,
          current: from || prev.current,
          remote: to || prev.remote,
          updated: false,
          fetchedAt: Date.now(),
        },
      },
    }));
  },

  markUpdated: (packId, to) => {
    const id = (packId || "").trim();
    if (!id) return;
    const prev = get().byId[id] || emptyStatus();
    const ver = to || prev.remote || prev.current;
    set((state) => ({
      byId: {
        ...state.byId,
        [id]: {
          has_updater: true,
          current: ver,
          remote: ver,
          updated: true,
          fetchedAt: Date.now(),
        },
      },
    }));
  },
}));
