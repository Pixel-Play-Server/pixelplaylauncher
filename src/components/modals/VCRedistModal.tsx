"use client";

import { Icon } from "@iconify/react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import { Button } from "../ui/buttons/Button";
import { useThemeStore } from "../../store/useThemeStore";

export type VCRedistInfo = {
  title?: string;
  message?: string;
  url?: string;
  path?: string;
};

type Props = {
  info: VCRedistInfo;
  onClose: () => void;
};

export function VCRedistModal({ info, onClose }: Props) {
  const accent = useThemeStore((s) => s.accentColor);
  const url = info.url || "https://aka.ms/vs/17/release/vc_redist.x64.exe";

  const reopen = async () => {
    try {
      toast.loading("Abriendo instalador de Visual C++…", { id: "vc-setup" });
      await invoke("install_vcredist");
      toast.success("Instalador abierto — aceptá UAC y completá el setup", {
        id: "vc-setup",
        duration: 8000,
      });
    } catch (e) {
      toast.dismiss("vc-setup");
      window.open(url, "_blank");
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el setup");
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-6">
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
        <span
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accent.value }}
        />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Icon
              icon="solar:danger-triangle-bold"
              className="text-3xl shrink-0 mt-0.5"
              style={{ color: accent.value }}
            />
            <div>
              <h2 className="text-xl font-bold text-white">
                {info.title || "Instalá Visual C++"}
              </h2>
              <p className="text-sm text-zinc-300 mt-2 whitespace-pre-line leading-relaxed">
                {info.message ||
                  "Minecraft necesita Visual C++ Redistributable (x64). Se abrió el instalador de Microsoft. Aceptá UAC, instalá, y volvé a jugar."}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={reopen} className="flex-1">
              Abrir instalador otra vez
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.open(url, "_blank");
              }}
              className="flex-1"
            >
              Descargar desde Microsoft
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await invoke("dismiss_vcredist");
                } catch {
                  /* ignore */
                }
                toast.success("Listo — volvé a pulsar Jugar");
                onClose();
              }}
            >
              Ya lo instalé
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
