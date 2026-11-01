"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useThemeStore } from "../../store/useThemeStore";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";
import type { SkinVariant } from "../../types/localSkin";
import type { TexturesData } from "../../types/minecraft";
import { accountSkinUrl } from "../../lib/pixelplayCdn";
import { SkinView3DWrapper } from "../common/SkinView3DWrapper";
import { cn } from "../../lib/utils";
import { useAccountSkinModelStore, variantFromTextures } from "../../store/useAccountSkinModelStore";

type Props = {
  reloadToken?: number;
};

async function skinPngToBase64(url: string, query: string): Promise<string> {
  try {
    return await MinecraftSkinService.getBase64FromSkinSource({
      type: "Url",
      details: { url },
    });
  } catch {
    return await MinecraftSkinService.getBase64FromSkinSource({
      type: "Profile",
      details: { query },
    });
  }
}

export function CurrentAccountSkin({ reloadToken = 0 }: Props) {
  const activeAccount = useMinecraftAuthStore((s) => s.activeAccount);
  const accentColor = useThemeStore((s) => s.accentColor);
  const variant = useAccountSkinModelStore((s) => s.variant);
  const setVariant = useAccountSkinModelStore((s) => s.setVariant);
  const [skinUrl, setSkinUrl] = useState("");
  const [textureUrl, setTextureUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const username =
    activeAccount?.minecraft_username || activeAccount?.username || "";

  const load = useCallback(async () => {
    if (!activeAccount) {
      setSkinUrl("");
      setTextureUrl("");
      return;
    }

    const fallback = accountSkinUrl(activeAccount.id, username);
    setSkinUrl(fallback);

    try {
      const data = await MinecraftSkinService.getUserSkinData(
        activeAccount.id,
        activeAccount.access_token,
      );
      const texturesProp = data?.properties?.find(
        (prop: { name: string; value: string }) => prop.name === "textures",
      );
      if (!texturesProp) return;

      const texturesJson = JSON.parse(atob(texturesProp.value)) as TexturesData;
      const skinInfo = texturesJson.textures?.SKIN;
      if (skinInfo?.url) {
        setTextureUrl(skinInfo.url);
      }
      setSkinUrl(fallback);
      setVariant(variantFromTextures(skinInfo?.metadata?.model));
    } catch (err) {
      console.error("[CurrentAccountSkin] Failed to load skin data:", err);
    }
  }, [activeAccount, username, setVariant]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  const applyVariant = async (next: SkinVariant) => {
    if (!activeAccount || next === variant || busy) return;
    if (!activeAccount.pixel_account && (activeAccount.offline || !activeAccount.access_token)) {
      toast.error("Inicia sesión con Pixel o Microsoft para cambiar el modelo");
      return;
    }

    const previous = variant;
    setVariant(next);
    setBusy(true);

    const run = async () => {
      const source =
        textureUrl ||
        skinUrl ||
        accountSkinUrl(activeAccount.id, username);
      if (!source) {
        throw new Error("No se pudo obtener la skin actual");
      }
      const base64 = await skinPngToBase64(source, activeAccount.id || username);
      await MinecraftSkinService.applySkinFromBase64(
        activeAccount.id,
        activeAccount.access_token,
        base64,
        next,
      );
    };

    try {
      await toast.promise(run(), {
        loading: next === "slim" ? "Aplicando modelo slim…" : "Aplicando modelo normal…",
        success: next === "slim" ? "Skin en modelo slim" : "Skin en modelo normal",
        error: (err) => (err instanceof Error ? err.message : String(err)),
      });
    } catch {
      setVariant(previous);
    } finally {
      setBusy(false);
    }
  };

  if (!activeAccount) return null;

  const previewUrl = skinUrl || accountSkinUrl(activeAccount.id, username);

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-xl border p-4"
      style={{
        backgroundColor: `${accentColor.value}14`,
        borderColor: `${accentColor.value}55`,
      }}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto h-[210px] w-[130px] shrink-0 overflow-hidden rounded-lg bg-black/30 sm:mx-0">
          <SkinView3DWrapper
            skinUrl={previewUrl || undefined}
            skinVariant={variant}
            width={130}
            height={210}
            zoom={0.9}
            enableAutoRotate
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="mb-1 font-minecraft text-lg lowercase tracking-wide text-white/55">
            Skin actual
          </p>
          <h2 className="font-minecraft-ten text-2xl text-white sm:text-3xl">
            {username}
          </h2>
          <p className="mt-1 font-minecraft-ten text-sm text-white/60">
            Modelo {variant === "slim" ? "slim (Alex)" : "normal (Steve)"}
          </p>

          <div className="mt-4 inline-flex rounded-lg border border-white/15 bg-black/30 p-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyVariant("classic")}
              className={cn(
                "rounded-md px-4 py-2 font-minecraft text-xl lowercase transition-all duration-200",
                variant === "classic"
                  ? "text-white"
                  : "text-white/50 hover:text-white/80",
                busy && "cursor-wait opacity-70",
              )}
              style={
                variant === "classic"
                  ? {
                      backgroundColor: `${accentColor.value}50`,
                    }
                  : undefined
              }
            >
              Normal
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyVariant("slim")}
              className={cn(
                "rounded-md px-4 py-2 font-minecraft text-xl lowercase transition-all duration-200",
                variant === "slim"
                  ? "text-white"
                  : "text-white/50 hover:text-white/80",
                busy && "cursor-wait opacity-70",
              )}
              style={
                variant === "slim"
                  ? {
                      backgroundColor: `${accentColor.value}50`,
                    }
                  : undefined
              }
            >
              Slim
            </button>
          </div>
        </div>

        {busy && (
          <div className="absolute right-4 top-4 text-white/60">
            <Icon icon="solar:refresh-bold" className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
