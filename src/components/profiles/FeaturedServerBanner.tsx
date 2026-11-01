"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { useThemeStore } from "../../store/useThemeStore";
import { useProfileStore } from "../../store/profile-store";
import * as ProcessService from "../../services/process-service";
import { cn } from "../../lib/utils";

type FeaturedInfo = {
  badge: string;
  name: string;
  address: string;
  description: string;
  packId: string;
};

type EnsureResult = {
  profileId: string;
  created: boolean;
  address: string;
  packId: string;
  name: string;
};

const FALLBACK: FeaturedInfo = {
  badge: "Promocionado",
  name: "Pixel Play",
  address: "mc.pixelplay.gg",
  description: "Survival oficial Fabric 1.21.11",
  packId: "pixelplay-survival-1211",
};

export function FeaturedServerBanner() {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { profiles, fetchProfiles } = useProfileStore();
  const [info, setInfo] = useState<FeaturedInfo>(FALLBACK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await invoke<FeaturedInfo>("get_featured_server");
        if (!cancelled && remote?.address) {
          setInfo({ ...FALLBACK, ...remote });
        }
      } catch {
        /* local fallback */
      }
      // Recreate official pack profile in background if missing (e.g. user deleted it).
      try {
        await invoke<EnsureResult>("ensure_featured_server_profile");
        if (!cancelled) await fetchProfiles();
      } catch {
        /* will retry on play */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfiles]);

  // Only the exact official pack — never match random "Pixel Play …" profiles by name.
  const existingId =
    profiles.find((p) => p.selected_pixelplay_pack_id === info.packId)?.id ?? null;

  const onPlay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      let id = existingId;
      if (!id) {
        const ensured = await toast.promise(
          invoke<EnsureResult>("ensure_featured_server_profile"),
          {
            loading: "Preparando el pack de Pixel Play…",
            success: (r) =>
              r.created ? "Pack instalado. Lanzando…" : "Perfil listo. Lanzando…",
            error: (err) => (err instanceof Error ? err.message : String(err)),
          },
        );
        id = ensured.profileId;
        await fetchProfiles();
      }
      if (!id) {
        throw new Error("No se pudo preparar el perfil de Pixel Play");
      }
      await toast.promise(ProcessService.launch(id, undefined, info.address), {
        loading: `Entrando a ${info.address}…`,
        success: `Lanzando ${info.name}`,
        error: (err) => (err instanceof Error ? err.message : String(err)),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg && !/abort/i.test(msg)) toast.error(msg);
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative mb-3 overflow-hidden rounded-lg border px-3 py-2.5"
      style={{
        backgroundColor: `${accentColor.value}14`,
        borderColor: `${accentColor.value}70`,
      }}
    >
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded border border-white/15 bg-black/25 px-2 py-0.5">
            <Icon icon="solar:medal-ribbons-star-bold" className="h-3 w-3 text-yellow-300" />
            <span className="font-minecraft text-xs lowercase tracking-wide text-yellow-200/90">
              {info.badge}
            </span>
          </div>
          <h2 className="truncate font-minecraft-ten text-base text-white normal-case sm:text-lg">
            {info.name}
          </h2>
          <p className="truncate font-minecraft-ten text-[11px] text-white/55">
            {info.address}
            <span className="mx-1.5 text-white/25">·</span>
            {info.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onPlay()}
          disabled={busy}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5",
            "font-minecraft text-base lowercase text-white transition-all duration-150",
            busy ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-[0.98]",
          )}
          style={{
            backgroundColor: `${accentColor.value}35`,
            borderColor: accentColor.value,
          }}
        >
          <Icon
            icon={busy ? "solar:refresh-bold" : "solar:play-bold"}
            className={cn("h-4 w-4", busy && "animate-spin")}
          />
          {busy ? "…" : "jugar"}
        </button>
      </div>
    </div>
  );
}
