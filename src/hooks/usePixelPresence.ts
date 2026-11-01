import { useEffect } from "react";
import { useMinecraftAuthStore } from "../store/minecraft-auth-store";
import { getRunningProcesses } from "../services/process-service";
import { setPresence } from "../services/pixel-friends-service";
import { usePresenceStore } from "../store/presence-store";
import { setVisibleInterval } from "../lib/visible-interval";

export function usePixelPresence() {
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);

  useEffect(() => {
    if (!activeAccount?.pixel_account) {
      usePresenceStore.getState().setStatus("offline");
      return;
    }

    let cancelled = false;
    const beat = async () => {
      try {
        const running = await getRunningProcesses();
        const status = running.length > 0 ? "ingame" : "online";
        if (cancelled) {
          return;
        }
        usePresenceStore.getState().setStatus(status);
        const out = await setPresence(status);
        if (!cancelled && out?.status) {
          usePresenceStore.getState().setStatus(out.status);
        }
      } catch {
        /* el loop de Go sigue mandando el heartbeat */
      }
    };

    const stop = setVisibleInterval(beat, 20000, { immediate: true });
    return () => {
      cancelled = true;
      stop();
    };
  }, [activeAccount?.id, activeAccount?.pixel_account]);
}
