import { create } from "zustand";
import type { SkinVariant } from "../types/localSkin";
import type { TexturesData } from "../types/minecraft";
import { MinecraftSkinService } from "../services/minecraft-skin-service";

interface AccountSkinModelState {
  accountId: string | null;
  variant: SkinVariant;
  setVariant: (variant: SkinVariant) => void;
  ensureLoaded: (accountId: string, accessToken?: string | null) => Promise<void>;
  reset: () => void;
}

export function variantFromTextures(model?: string | null): SkinVariant {
  return model === "slim" ? "slim" : "classic";
}

export const useAccountSkinModelStore = create<AccountSkinModelState>((set, get) => ({
  accountId: null,
  variant: "classic",
  setVariant: (variant) => set({ variant }),
  reset: () => set({ accountId: null, variant: "classic" }),
  ensureLoaded: async (accountId, accessToken) => {
    if (!accountId) {
      set({ accountId: null, variant: "classic" });
      return;
    }
    if (get().accountId === accountId) return;

    set({ accountId, variant: "classic" });
    if (!accessToken) return;

    try {
      const data = await MinecraftSkinService.getUserSkinData(accountId, accessToken);
      const texturesProp = data?.properties?.find(
        (prop: { name: string; value: string }) => prop.name === "textures",
      );
      if (!texturesProp) return;

      const texturesJson = JSON.parse(atob(texturesProp.value)) as TexturesData;
      const model = texturesJson.textures?.SKIN?.metadata?.model;
      if (get().accountId === accountId) {
        set({ variant: variantFromTextures(model) });
      }
    } catch (err) {
      console.error("[AccountSkinModel] Failed to load variant:", err);
    }
  },
}));
