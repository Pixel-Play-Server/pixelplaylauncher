import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
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
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    invoke<HorizonMod[]>("list_horizon_registry_mods")
      .then((items) => { if (active) setMods(items ?? []); })
      .catch((e) => { if (active) setError(String(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function install(mod: HorizonMod) {
    setBusy(mod.id);
    try {
      const installed = await invoke<string>("install_horizon_registry_mod", { profileId, modId: mod.id });
      toast.success(`${installed} instalado. Actívalo desde Options > Mods en Horizon.`);
    } catch (e) { toast.error(String(e)); }
    finally { setBusy(null); }
  }
  return (
    <section className="rounded-md border border-white/20 p-4 mb-4">
      <h3 className="font-minecraft-ten text-lg text-white mb-2">Horizon Registry · Mods .hmod</h3>
      <p className="text-sm text-white/60 mb-3">Catálogo oficial de Horizon. Solo mods .hmod compatibles con 26.3; los mods nativos .hnmod usan otro sistema.</p>
      <input className="bg-black/40 text-white border border-white/20 p-2 w-full mb-3" placeholder="Buscar mods Horizon..." value={query} onChange={e => setQuery(e.target.value)} />
      {loading && <p className="text-white/60">Consultando proveedor...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && mods.length === 0 && <p className="text-white/60">No hay mods .hmod compatibles publicados actualmente.</p>}
      {mods.filter(m => `${m.name} ${m.summary}`.toLowerCase().includes(query.toLowerCase())).map(m => (
        <div key={m.id} className="flex items-center justify-between gap-4 border-t border-white/10 py-3">
          <div><strong className="text-white">{m.name}</strong><p className="text-white/60 text-sm">{m.summary} · v{m.versions[0]?.version}</p></div>
          <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => install(m)}>{busy === m.id ? "Instalando..." : "Instalar"}</Button>
        </div>
      ))}
    </section>
  );
}
