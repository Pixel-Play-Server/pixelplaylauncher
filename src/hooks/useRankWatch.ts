import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useMinecraftAuthStore } from "../store/minecraft-auth-store";
import { useRankUpgradeStore } from "../store/rank-upgrade-store";
import { refreshRankCatalog } from "../lib/pixel-rank";
import { setVisibleInterval } from "../lib/visible-interval";
import type { MinecraftAccount } from "../types/minecraft";

type RankRefresh = {
  changed?: boolean;
  previous?: string;
  rank?: string;
  rank_label?: string;
  rank_color?: string;
  perks?: string[];
  username?: string;
  uuid?: string;
  account?: MinecraftAccount;
};

function seenKey(id: string) {
  return `pixel-celebrated-rank-${id}`;
}

export function useRankWatch() {
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);

  useEffect(() => {
    if (!activeAccount?.pixel_account || !activeAccount.id) {
      return;
    }
    const id = activeAccount.id;
    let cancelled = false;

    const apply = async () => {
      try {
        await refreshRankCatalog(false);
        const out = await invoke<RankRefresh>("refresh_pixel_profile");
        if (cancelled || !out) {
          return;
        }
        if (out.account) {
          const current = useMinecraftAuthStore.getState();
          const accounts = current.accounts.map((acc) =>
            acc.id === out.account?.id
              ? {
                  ...acc,
                  ...out.account,
                  rank: out.rank || out.account.rank,
                  rank_label: out.rank_label || out.account.rank_label,
                  rank_color: out.rank_color || out.account.rank_color,
                }
              : acc,
          );
          const active =
            accounts.find((acc) => acc.id === current.activeAccount?.id) || current.activeAccount;
          useMinecraftAuthStore.setState({ accounts, activeAccount: active });
        }
        const next = (out.rank || "").toLowerCase();
        if (!next) {
          return;
        }
        const stored = localStorage.getItem(seenKey(id));
        if (!stored) {
          localStorage.setItem(seenKey(id), next);
          return;
        }
        if (stored !== next) {
          localStorage.setItem(seenKey(id), next);
          useRankUpgradeStore.getState().show({
            from: out.previous || stored,
            to: next,
            username: out.username,
            uuid: out.uuid,
            perks: out.perks,
          });
        }
      } catch {
        /* sin sesión Pixel no hay ranking en vivo */
      }
    };

    const stopPoll = setVisibleInterval(apply, 20000, { immediate: true });

    let unlisten: (() => void) | undefined;
    void listen<{ from?: string; to?: string; username?: string; uuid?: string }>(
      "rank_changed",
      (event) => {
        const p = event.payload;
        const mine =
          (p?.username && activeAccount.username && p.username.toLowerCase() === activeAccount.username.toLowerCase()) ||
          (p?.uuid && activeAccount.id && p.uuid.replace(/-/g, "") === activeAccount.id.replace(/-/g, ""));
        if (!mine) {
          return;
        }
        void refreshRankCatalog(true);
        void apply();
      },
    ).then((fn) => {
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      stopPoll();
      unlisten?.();
    };
  }, [activeAccount?.id, activeAccount?.pixel_account, activeAccount?.username]);
}
