"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-hot-toast";
import { Button } from "../ui/buttons/Button";
import { Input } from "../ui/Input";
import { VanillaCapeImage } from "./VanillaCapeImage";
import { VanillaCapeService } from "../../services/vanilla-cape-service";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import type { VanillaCape } from "../../types/vanillaCapes";

export function CapeBrowser({ embedded = false }: { embedded?: boolean }) {
  const account = useMinecraftAuthStore(s => s.activeAccount);
  const [capes, setCapes] = useState<VanillaCape[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const eligible = Boolean(account && !account.offline);
  const refresh = useCallback(async () => {
    if (!eligible) return;
    const request = ++generation.current;
    const id = account?.id;
    setLoading(true); setError(null);
    try {
      const owned = await VanillaCapeService.getOwnedVanillaCapes();
      if (request === generation.current && useMinecraftAuthStore.getState().activeAccount?.id === id) setCapes(owned);
    } catch (e) {
      if (request === generation.current) setError(e instanceof Error ? e.message : String(e));
    } finally { if (request === generation.current) setLoading(false); }
  }, [account?.id, eligible]);

  useEffect(() => {
    setCapes([]); setError(null); setEquipping(null); setQuery(""); setLoading(false);
    void refresh();
    return () => { generation.current++; };
  }, [refresh]);

  const equip = async (id: string | null) => {
    if (equipping !== null || loading) return;
    const accountID = account?.id;
    setEquipping(id ?? "none"); setError(null);
    try {
      await VanillaCapeService.equipVanillaCape(id);
      if (useMinecraftAuthStore.getState().activeAccount?.id !== accountID) return;
      setCapes(items => items.map(c => ({ ...c, equipped: c.id === id, active: c.id === id })));
      toast.success(id ? "Capa equipada" : "Capa desactivada");
    } catch (e) {
      if (useMinecraftAuthStore.getState().activeAccount?.id === accountID) setError(e instanceof Error ? e.message : String(e));
    } finally { if (useMinecraftAuthStore.getState().activeAccount?.id === accountID) setEquipping(null); }
  };
  const visible = capes.filter(c => c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return (
    <section className={`font-minecraft-ten h-full min-h-0 flex flex-col ${embedded ? "p-1" : "p-6"}`}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div><p className="pixel-eyebrow">Personalización</p><h1 className="font-minecraft-ten text-2xl text-white mt-1">Capas vanilla</h1>
          <p className="text-sm text-white/50 mt-2">Las capas de Minecraft asociadas a tu cuenta.</p></div>
        {eligible && <Button size="sm" variant="secondary" disabled={loading || equipping !== null} onClick={() => void refresh()} icon={<Icon icon="solar:refresh-linear" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />}>Actualizar</Button>}
      </div>
      {!eligible ? <div className="pixel-empty-state"><Icon icon="solar:shield-user-linear" className="w-10 h-10 text-white/35" /><h2>Conecta tu cuenta Minecraft</h2><p>Selecciona una cuenta Microsoft con Minecraft para ver y equipar sus capas vanilla.</p></div> : <>
        {error && <div role="alert" className="p-4 mb-4 border border-red-400/30 bg-red-500/10 text-red-200 text-sm">{error}</div>}
        <div className="mb-5 max-w-sm"><Input aria-label="Buscar capas" placeholder="Buscar capas…" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {loading && !capes.length ? <p role="status" className="text-white/50 text-sm py-8">Cargando tus capas…</p> :
          !capes.length && !error ? <div className="pixel-empty-state"><Icon icon="solar:flag-linear" className="w-10 h-10 text-white/35" /><h2>Sin capas en esta cuenta</h2><p>Las capas que obtengas en Minecraft aparecerán aquí.</p></div> :
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {capes.length > 0 && <article className="pixel-cape-card">
              <div className="h-48 flex items-center justify-center text-white/25"><Icon icon="solar:forbidden-circle-linear" className="w-14 h-14" /></div>
              <h2 className="font-minecraft-ten text-sm text-white">Sin capa</h2>
              <Button size="sm" variant="secondary" className="w-full mt-3" disabled={loading || equipping !== null || !capes.some(c => c.equipped)} onClick={() => void equip(null)}>{equipping === "none" ? "Aplicando…" : capes.some(c => c.equipped) ? "Quitar capa" : "Seleccionado"}</Button>
            </article>}
            {visible.map(cape => <article key={cape.id} className={`pixel-cape-card ${cape.equipped ? "pixel-cape-active" : ""}`}>
              <div className="h-48 flex items-center justify-center"><VanillaCapeImage imageUrl={cape.url} width={90} /></div>
              <h2 className="font-minecraft-ten text-sm text-white truncate" title={cape.name}>{cape.name}</h2>
              <Button size="sm" variant={cape.equipped ? "success" : "secondary"} className="w-full mt-3" disabled={loading || equipping !== null || cape.equipped} onClick={() => void equip(cape.id)}>{equipping === cape.id ? "Aplicando…" : cape.equipped ? "Equipada" : "Equipar"}</Button>
            </article>)}
          </div>}
        </div>
      </>}
    </section>
  );
}
