import { PIXELPLAY_API } from "./pixelplayCdn";

export type PresenceStatus = "online" | "ingame" | "idle" | "offline";

export type RankInfo = {
  key: string;
  label: string;
  color: string;
  perks: string[];
};

type RankDef = {
  key: string;
  label: string;
  color: string;
  gem?: string;
  exclusive?: boolean;
  aliases?: string[];
  perks?: string[];
};

type RankCatalog = {
  version?: number;
  updatedAt?: string;
  default?: string;
  ranks: RankDef[];
};

const FALLBACK: RankCatalog = {
  version: 0,
  default: "usuario",
  ranks: [
    {
      key: "usuario",
      label: "Usuario",
      color: "#059669",
      aliases: ["user"],
      perks: ["Acceso a la network Pixel", "Perfil en login.pixelplay.gg"],
    },
    {
      key: "mini_pixel",
      label: "Mini Pixel",
      color: "#d97706",
      aliases: ["cobre", "copper", "mini"],
      perks: ["Rango Mini Pixel de pago", "Tag cobre Mini Pixel"],
    },
    {
      key: "pixel",
      label: "Pixel",
      color: "#34d399",
      aliases: ["esmeralda", "emerald"],
      perks: ["Capas propias", "Soporte privado", "Tag esmeralda Pixel"],
    },
    {
      key: "pixel_plus",
      label: "Pixel+",
      color: "#c084fc",
      aliases: ["pixel+", "amatista", "amethyst"],
      perks: ["Capas Pixel exclusivas", "Soporte privado", "Prioridad en la network", "Tag amatista Pixel+"],
    },
    {
      key: "fundador",
      label: "Fundador",
      color: "#ef4444",
      exclusive: true,
      aliases: ["founder", "fundadores"],
      perks: [
        "Rango Fundador exclusivo",
        "Tag Fundador rojo",
        "Acceso a la network Pixel",
        "Perfil en login.pixelplay.gg",
        "Rango Mini Pixel de pago",
        "Tag cobre Mini Pixel",
        "Capas propias",
        "Capas Pixel exclusivas",
        "Soporte privado",
        "Tag esmeralda Pixel",
        "Tag amatista Pixel+",
        "Prioridad en la network",
      ],
    },
  ],
};

let catalog: RankCatalog = FALLBACK;
let lastFetch = 0;
let inflight: Promise<void> | null = null;

function indexCatalog(c: RankCatalog): Map<string, RankDef> {
  const map = new Map<string, RankDef>();
  for (const r of c.ranks || []) {
    const key = (r.key || "").toLowerCase().trim();
    if (!key) continue;
    map.set(key, r);
    for (const a of r.aliases || []) {
      const alias = (a || "").toLowerCase().trim();
      if (alias) map.set(alias, r);
    }
  }
  return map;
}

let byKey = indexCatalog(catalog);

export function getRankCatalog(): RankCatalog {
  return catalog;
}

export async function refreshRankCatalog(force = false): Promise<RankCatalog> {
  const now = Date.now();
  if (!force && now - lastFetch < 60_000 && catalog.version) {
    return catalog;
  }
  if (inflight) {
    await inflight;
    return catalog;
  }
  inflight = (async () => {
    try {
      const res = await fetch(`${PIXELPLAY_API}/api/v1/ranks`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as RankCatalog;
      if (data?.ranks?.length) {
        catalog = data;
        byKey = indexCatalog(catalog);
        lastFetch = Date.now();
      }
    } catch {
      // keep last good / fallback
      if (!lastFetch) lastFetch = Date.now();
    } finally {
      inflight = null;
    }
  })();
  await inflight;
  return catalog;
}

function resolveDef(rank?: string | null): RankDef | null {
  const key = (rank || "").toLowerCase().trim();
  if (!key) return null;
  return byKey.get(key) || null;
}

export function rankInfo(
  rank?: string | null,
  pixelAccount?: boolean,
  rankLabel?: string | null,
  rankColor?: string | null,
): RankInfo | null {
  const key = (rank || (pixelAccount ? "usuario" : "")).toLowerCase().trim();
  if (!key && !pixelAccount) {
    return null;
  }
  const resolved = key || "usuario";
  const def = resolveDef(resolved) || resolveDef(catalog.default || "usuario") || FALLBACK.ranks[0];
  return {
    key: def.key,
    label: rankLabel?.trim() || def.label,
    color: rankColor?.trim() || def.color,
    perks: def.perks?.length ? [...def.perks] : [],
  };
}

export function presenceInfo(status?: string | null): {
  key: PresenceStatus;
  color: string;
} {
  switch ((status || "").toLowerCase()) {
    case "ingame":
    case "in_game":
    case "playing":
    case "jugando":
      return { key: "ingame", color: "#38bdf8" };
    case "idle":
    case "away":
    case "ausente":
      return { key: "idle", color: "#fbbf24" };
    case "offline":
    case "desconectado":
      return { key: "offline", color: "#6b7280" };
    default:
      return { key: "online", color: "#22c55e" };
  }
}
