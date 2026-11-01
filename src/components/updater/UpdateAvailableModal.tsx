"use client";

import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import { Button } from "../ui/buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";

export type UpdateAvailableInfo = {
  from?: string;
  to?: string;
  url?: string;
  notes?: string;
  message?: string;
  source?: string;
};

type Props = {
  info: UpdateAvailableInfo;
  onClose: () => void;
};

export function UpdateAvailableModal({ info, onClose }: Props) {
  const accent = useThemeStore((s) => s.accentColor);
  const to = info.to || "nueva versión";
  const from = info.from || "actual";

  const handleDownload = async () => {
    try {
      toast.loading("Descargando actualización…", { id: "update-dl" });
      const res = await invoke<{
        downloaded?: boolean;
        path?: string;
        version?: string;
        reason?: string;
        restarting?: boolean;
        apply_error?: string;
      }>("download_update", {});
      toast.dismiss("update-dl");
      if (res?.restarting) {
        toast.success(`Instalando ${res.version || to} y reiniciando…`);
        return;
      }
      if (res?.apply_error) {
        toast.error(`Descargada, pero no se pudo instalar: ${res.apply_error}`);
        return;
      }
      if (res?.downloaded && res.path) {
        toast.success(`Descargada: ${res.path}`);
      } else {
        toast.success(res?.reason === "up_to_date" ? "Ya estás al día" : "Sin archivo nuevo");
      }
    } catch (e) {
      toast.dismiss("update-dl");
      if (info.url) {
        window.open(info.url, "_blank");
        toast.success("Se abrió el enlace de descarga");
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden border-2 border-b-4"
        style={{
          backgroundColor: "rgba(8, 10, 12, 0.97)",
          backgroundImage: `linear-gradient(165deg, ${accent.value}30 0%, transparent 48%)`,
          borderColor: `${accent.value}cc`,
          boxShadow: `0 10px 0 rgba(0,0,0,0.35), 0 22px 40px rgba(0,0,0,0.55), inset 0 1px 0 ${accent.light}50`,
        }}
      >
        <span
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: accent.light }}
        />
        <div className="relative p-6 pt-7">
          <div className="flex items-start gap-4 mb-5">
            <div
              className="w-14 h-14 flex-shrink-0 flex items-center justify-center border-2 border-b-4"
              style={{
                backgroundColor: `${accent.value}45`,
                borderColor: `${accent.value}aa`,
                boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
              }}
            >
              <Icon icon="solar:download-bold" className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-minecraft text-3xl lowercase leading-none">
                Actualización
              </h2>
              <p className="text-white/70 text-sm mt-2 font-minecraft-ten">
                {from}{" "}
                <span className="text-white/40">→</span>{" "}
                <span className="text-white font-medium">{to}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white p-1"
              aria-label="Cerrar"
            >
              <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
            </button>
          </div>

          <p className="relative text-white/85 text-sm leading-relaxed mb-6 font-minecraft-ten">
            {info.notes ||
              info.message ||
              "Hay una nueva build de Pixel Play. Descargala para seguir al día."}
          </p>

          {info.source === "push" && (
            <p className="relative text-emerald-300 text-xs mb-4 font-minecraft-ten">
              Recibido en vivo desde el server Pixel.
            </p>
          )}

          <div className="relative flex gap-3 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Después
            </Button>
            <Button variant="3d" onClick={handleDownload}>
              Descargar e instalar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
