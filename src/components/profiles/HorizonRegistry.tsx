"use client";

import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { useThemeStore } from "../../store/useThemeStore";
import { SearchInput } from "../ui/SearchInput";
import { Button } from "../ui/buttons/Button";

interface HorizonMod {
  id: string;
  name: string;
  summary: string;
  versions: { version: string; game: string }[];
}

export function HorizonRegistry({ profileId }: { profileId: string }) {
  const [mods, setMods] = useState<HorizonMod[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [installed, setInstalled] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const accentColor = useThemeStore(state => state.accentColor);

  const reload = async () => {
    setError("");
    setLoading(true);
    try {
      const items = await invoke<HorizonMod[]>("list_horizon_registry_mods");
      setMods(items ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);
  const filtered = useMemo(() => mods.filter(mod =>
    `${mod.name} ${mod.id} ${mod.summary}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [mods, query]);

  async function install(mod: HorizonMod) {
    setBusy(mod.id);
    try {
      const id = await invoke<string>("install_horizon_registry_mod", { profileId, modId: mod.id });
      setInstalled(current => [...current, mod.id]);
      toast.success(`${id} instalado. Actívalo en Options > Mods dentro de Horizon.`);
    } catch (e) { toast.error(String(e)); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-[450px]">
          <SearchInput value={query} onChange={setQuery} placeholder="Search Horizon mods..." className="w-full" />
          <button title="Actualizar catálogo" aria-label="Actualizar catálogo" onClick={() => void reload()}
            className="h-12 w-12 flex-shrink-0 flex items-center justify-center border border-white/15 text-white/60 hover:text-white hover:border-white/40 bg-black/25">
            <Icon icon="solar:refresh-bold" className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="px-3 py-2 border border-white/15 text-white/60 font-minecraft-ten text-xs">26.3</span>
          <span className="px-3 py-2 border font-minecraft-ten text-xs" style={{borderColor:accentColor.value, color:accentColor.value}}>
            <Icon icon="solar:planet-bold" className="inline mr-2" />HORIZON REGISTRY
          </span>
        </div>
      </div>

      {error && <div className="border border-red-500/30 bg-red-950/20 text-red-300 p-4 font-minecraft-ten">
        <Icon icon="solar:danger-triangle-bold" className="inline mr-2" />{error}
      </div>}
      {loading && <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/50 font-minecraft-ten">
        <Icon icon="solar:refresh-bold" className="text-3xl animate-spin" />Cargando Horizon Registry...
      </div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-3">
          <Icon icon="solar:box-minimalistic-bold" className="text-5xl" />
          <p className="font-minecraft-ten">{query ? "No se encontraron mods." : "No hay mods .hmod compatibles disponibles."}</p>
        </div>
      )}
      {!loading && !error && <div className="flex flex-col gap-1.5">
        {filtered.map(mod => (
          <article key={mod.id} className="flex items-center gap-4 p-3 border border-white/15 bg-black/20 hover:bg-white/[0.04] transition-colors min-h-[112px]">
            <div className="h-20 w-20 flex-shrink-0 flex items-center justify-center bg-emerald-950/40 border border-emerald-800/30">
              <Icon icon="solar:box-bold-duotone" className="text-4xl" style={{color:accentColor.value}} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-minecraft-ten text-xl text-white truncate">{mod.name}</h3>
              <p className="text-white/70 text-sm mt-1 line-clamp-2">{mod.summary}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-0.5 bg-white/5 text-white/60 text-xs">Horizon</span>
                <span className="px-2 py-0.5 bg-white/5 text-white/60 text-xs">.hmod</span>
                <span className="px-2 py-0.5 bg-white/5 text-white/60 text-xs">{mod.versions[0]?.version ?? "—"}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm" disabled={busy !== null || installed.includes(mod.id)} onClick={() => void install(mod)}>
              <Icon icon={installed.includes(mod.id) ? "solar:check-circle-bold" : "solar:download-minimalistic-bold"} className="inline mr-2" />
              {installed.includes(mod.id) ? "INSTALADO" : busy === mod.id ? "INSTALANDO" : "INSTALAR"}
            </Button>
          </article>
        ))}
      </div>}
      <div className="text-xs text-white/35 mt-auto pt-3 font-minecraft-ten">
        Catálogo oficial Horizon · Solo archivos .hmod compatibles. Los mods Java no funcionan en Horizon.
      </div>
    </div>
  );
}
