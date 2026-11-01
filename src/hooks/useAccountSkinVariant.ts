import { useEffect } from "react";
import type { SkinVariant } from "../types/localSkin";
import { useMinecraftAuthStore } from "../store/minecraft-auth-store";
import { useAccountSkinModelStore } from "../store/useAccountSkinModelStore";

export function useAccountSkinVariant(): SkinVariant {
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const variant = useAccountSkinModelStore((s) => s.variant);
  const ensureLoaded = useAccountSkinModelStore((s) => s.ensureLoaded);
  const reset = useAccountSkinModelStore((s) => s.reset);

  useEffect(() => {
    if (!activeAccount?.id) {
      reset();
      return;
    }
    void ensureLoaded(activeAccount.id, activeAccount.access_token);
  }, [activeAccount?.id, activeAccount?.access_token, ensureLoaded, reset]);

  return variant;
}
