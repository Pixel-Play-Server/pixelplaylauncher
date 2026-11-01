import { create } from "zustand";
import type { RankUpgradeInfo } from "../components/account/RankUpgradeOverlay";

type RankUpgradeState = {
  info: RankUpgradeInfo | null;
  show: (info: RankUpgradeInfo) => void;
  hide: () => void;
};

export const useRankUpgradeStore = create<RankUpgradeState>((set) => ({
  info: null,
  show: (info) => set({ info }),
  hide: () => set({ info: null }),
}));
