"use client";

import { Icon } from "@iconify/react";
import { useThemeStore } from "../../store/useThemeStore";

export type PackUpdateInfo = {
  pack_id?: string;
  displayName?: string;
  from?: string;
  to?: string;
  notes?: string;
  status?: "available" | "downloading" | "done" | "error";
  message?: string;
};

type Props = {
  info: PackUpdateInfo;
  onClose: () => void;
};

export function PackUpdateModal({ info, onClose }: Props) {
  const accent = useThemeStore((s) => s.accentColor);
  const name = info.displayName || info.pack_id || "Pack";
  const from = info.from || "?";
  const to = info.to || "nueva versión";
  const done = info.status === "done";
  const failed = info.status === "error";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div
        className="relative w-full max-w-lg overflow-hidden border-2 border-b-4"
        style={{
          backgroundColor: "rgba(8, 10, 12, 0.97)",
          backgroundImage: `linear-gradient(165deg, ${accent.value}30 0%, transparent 48%)`,
          borderColor: `${accent.value}cc`,
          boxShadow: `0 10px 0 rgba(0,0,0,0.35), 0 22px 40px rgba(0,0,0,0.55)`,
        }}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Icon
              icon={
                failed
                  ? "solar:danger-triangle-bold"
                  : done
                    ? "solar:check-circle-bold"
                    : "solar:refresh-bold"
              }
              className={`w-8 h-8 ${done ? "text-emerald-400" : failed ? "text-amber-300" : "animate-spin text-white"}`}
            />
            <div>
              <h2 className="font-minecraft-ten text-xl text-white">
                {failed
                  ? "No se pudo actualizar el pack"
                  : done
                    ? `${name} actualizado`
                    : `Actualizando ${name}`}
              </h2>
              <p className="text-white/70 text-sm font-minecraft-ten">
                {from} → {to}
              </p>
            </div>
          </div>
          {info.notes && (
            <p className="text-white/60 text-sm leading-relaxed">{info.notes}</p>
          )}
          {info.message && (
            <p className="text-amber-200 text-sm">{info.message}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full border-2 px-4 py-2 font-minecraft text-xl normal-case text-white"
            style={{ borderColor: accent.value, backgroundColor: `${accent.value}40` }}
          >
            {done || failed ? "listo" : "ocultar"}
          </button>
        </div>
      </div>
    </div>
  );
}
