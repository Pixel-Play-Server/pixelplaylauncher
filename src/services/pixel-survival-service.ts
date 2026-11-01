import { invoke } from "@tauri-apps/api/core";

export type SurvivalSort = "money" | "playtime" | "kills" | "mobs" | "deaths" | "interactions";

export type SurvivalPlayer = {
  place: number;
  uuid: string;
  username: string;
  rank?: string;
  rankLabel?: string;
  rankColor?: string;
  money: number;
  playSeconds: number;
  lifetimeSeconds: number;
  daysPlayed: number;
  interactions: number;
  deaths: number;
  mobKills: number;
  playerKills: number;
  sessions: number;
  walkMeters: number;
  lastSeenUnix?: number;
  status?: string;
  statusAt?: number;
};

export type SurvivalBoard = {
  sort: SurvivalSort;
  currency: string;
  updatedAt: number;
  players: SurvivalPlayer[];
  me?: SurvivalPlayer;
};

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asPlayer(raw: unknown): SurvivalPlayer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const username = typeof obj.username === "string" ? obj.username : "";
  if (!username) {
    return null;
  }
  return {
    place: asNumber(obj.place),
    uuid: typeof obj.uuid === "string" ? obj.uuid : "",
    username,
    rank: typeof obj.rank === "string" ? obj.rank : undefined,
    rankLabel: typeof obj.rankLabel === "string" ? obj.rankLabel : undefined,
    rankColor: typeof obj.rankColor === "string" ? obj.rankColor : undefined,
    money: asNumber(obj.money),
    playSeconds: asNumber(obj.playSeconds),
    lifetimeSeconds: asNumber(obj.lifetimeSeconds),
    daysPlayed: asNumber(obj.daysPlayed),
    interactions: asNumber(obj.interactions),
    deaths: asNumber(obj.deaths),
    mobKills: asNumber(obj.mobKills),
    playerKills: asNumber(obj.playerKills),
    sessions: asNumber(obj.sessions),
    walkMeters: asNumber(obj.walkMeters),
    lastSeenUnix: asNumber(obj.lastSeenUnix, 0) || undefined,
    status: typeof obj.status === "string" ? obj.status : undefined,
    statusAt: asNumber(obj.statusAt, 0) || undefined,
  };
}

export async function listSurvivalBoard(sort: SurvivalSort = "money"): Promise<SurvivalBoard> {
  const raw = await invoke<Record<string, unknown>>("list_survival_board", { sort });
  const players = Array.isArray(raw?.players)
    ? raw.players.map(asPlayer).filter((item): item is SurvivalPlayer => item !== null)
    : [];
  return {
    sort: (typeof raw?.sort === "string" ? raw.sort : sort) as SurvivalSort,
    currency: typeof raw?.currency === "string" ? raw.currency : "$",
    updatedAt: asNumber(raw?.updatedAt),
    players,
    me: asPlayer(raw?.me) || undefined,
  };
}
