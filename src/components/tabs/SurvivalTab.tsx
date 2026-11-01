"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useThemeStore } from "../../store/useThemeStore";
import { Button } from "../ui/buttons/Button";
import { Input } from "../ui/Input";
import { PlayerHeadshot } from "../account/PlayerHeadshot";
import { RankTag } from "../account/RankTag";
import { presenceInfo } from "../../lib/pixel-rank";
import {
  listSurvivalBoard,
  type SurvivalPlayer,
  type SurvivalSort,
} from "../../services/pixel-survival-service";

const SORTS: SurvivalSort[] = ["money", "playtime", "kills", "mobs", "deaths"];

function formatMoney(value: number, currency: string): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? abs.toLocaleString("es-419", { maximumFractionDigits: 0 }) : abs.toLocaleString("es-419", { maximumFractionDigits: 2 });
  return `${currency}${formatted}`;
}

function formatPlay(seconds: number): string {
  if (seconds <= 0) {
    return "0m";
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

function formatSeen(unix: number | undefined): string {
  if (!unix) {
    return "—";
  }
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleString();
}

export function SurvivalTab() {
  const { t } = useTranslation();
  const accent = useThemeStore((s) => s.accentColor.value);
  const [sort, setSort] = useState<SurvivalSort>("money");
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("$");
  const [players, setPlayers] = useState<SurvivalPlayer[]>([]);
  const [me, setMe] = useState<SurvivalPlayer | undefined>();
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const board = await listSurvivalBoard(sort);
        if (cancelled) {
          return;
        }
        setCurrency(board.currency || "$");
        setPlayers(board.players);
        setMe(board.me);
        setSelected((prev) => {
          if (prev && board.players.some((p) => p.username === prev)) {
            return prev;
          }
          return board.me?.username || board.players[0]?.username || "";
        });
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return players;
    }
    return players.filter((p) => p.username.toLowerCase().includes(q));
  }, [players, query]);

  const detail = filtered.find((p) => p.username === selected) || me || filtered[0];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-6xl w-full mr-auto space-y-5">
        <div>
          <h2 className="font-minecraft text-4xl text-white lowercase">{t("survival.title")}</h2>
          <p className="text-white/60 font-minecraft-ten text-sm mt-1">{t("survival.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SORTS.map((key) => (
            <Button
              key={key}
              variant={sort === key ? "success" : "ghost"}
              onClick={() => setSort(key)}
            >
              {t(`survival.sort.${key}`)}
            </Button>
          ))}
          <div className="min-w-[180px] flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("survival.search")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
          <div
            className="rounded-md border overflow-hidden"
            style={{ backgroundColor: "#121212cc", borderColor: `${accent}55` }}
          >
            <div className="grid grid-cols-[48px_1fr_90px_90px_70px] gap-2 px-4 py-2 text-[11px] font-minecraft-ten uppercase tracking-wide text-white/45">
              <span>#</span>
              <span>{t("survival.col.player")}</span>
              <span>{t("survival.col.money")}</span>
              <span>{t("survival.col.time")}</span>
              <span>{t("survival.col.kills")}</span>
            </div>
            {loading && players.length === 0 ? (
              <p className="px-4 py-6 text-white/55 font-minecraft-ten text-sm">{t("survival.loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-white/55 font-minecraft-ten text-sm">{t("survival.empty")}</p>
            ) : (
              filtered.map((player) => {
                const active = player.username === detail?.username;
                const status = presenceInfo(player.status || "offline");
                return (
                  <button
                    key={player.uuid || player.username}
                    type="button"
                    onClick={() => setSelected(player.username)}
                    className="w-full grid grid-cols-[48px_1fr_90px_90px_70px] gap-2 items-center px-4 py-2.5 text-left border-t border-white/5"
                    style={{
                      backgroundColor: active ? `${accent}22` : "transparent",
                    }}
                  >
                    <span className="font-minecraft text-2xl text-white/70">{player.place || "—"}</span>
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="relative w-8 h-8 overflow-hidden rounded-sm border shrink-0"
                        style={{ borderColor: player.rankColor || accent }}
                      >
                        <PlayerHeadshot playerName={player.username} size={32} alt={player.username} />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black"
                          style={{ backgroundColor: status.color }}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-minecraft text-xl text-white lowercase truncate">
                          {player.username}
                        </span>
                        <RankTag
                          rank={player.rank}
                          pixelAccount
                          rankLabel={player.rankLabel}
                          rankColor={player.rankColor}
                        />
                      </span>
                    </span>
                    <span className="font-minecraft-ten text-sm text-white">{formatMoney(player.money, currency)}</span>
                    <span className="font-minecraft-ten text-sm text-white/80">{formatPlay(player.playSeconds)}</span>
                    <span className="font-minecraft-ten text-sm text-white/80">{player.playerKills}</span>
                  </button>
                );
              })
            )}
          </div>

          {detail ? (
            <div
              className="rounded-md border p-4 space-y-4"
              style={{ backgroundColor: "#121212cc", borderColor: `${detail.rankColor || accent}66` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 overflow-hidden rounded-sm border-2"
                  style={{ borderColor: detail.rankColor || accent }}
                >
                  <PlayerHeadshot playerName={detail.username} size={56} alt={detail.username} />
                </div>
                <div className="min-w-0">
                  <p className="font-minecraft text-3xl text-white lowercase truncate">{detail.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <RankTag
                      rank={detail.rank}
                      pixelAccount
                      rankLabel={detail.rankLabel}
                      rankColor={detail.rankColor}
                    />
                    <span className="text-[11px] font-minecraft-ten uppercase" style={{ color: presenceInfo(detail.status || "offline").color }}>
                      {t(`friends.status.${presenceInfo(detail.status || "offline").key}`)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label={t("survival.detail.money")} value={formatMoney(detail.money, currency)} color={accent} />
                <Stat label={t("survival.detail.rank")} value={detail.rankLabel || t("survival.detail.noRank")} color={detail.rankColor || accent} />
                <Stat label={t("survival.detail.month")} value={formatPlay(detail.playSeconds)} />
                <Stat label={t("survival.detail.lifetime")} value={formatPlay(detail.lifetimeSeconds)} />
                <Stat label={t("survival.detail.kills")} value={String(detail.playerKills)} />
                <Stat label={t("survival.detail.deaths")} value={String(detail.deaths)} />
                <Stat label={t("survival.detail.mobs")} value={String(detail.mobKills)} />
                <Stat label={t("survival.detail.days")} value={String(detail.daysPlayed)} />
              </div>
              <p className="text-[11px] font-minecraft-ten text-white/40">
                {t("survival.detail.seen")}: {formatSeen(detail.lastSeenUnix)}
              </p>
            </div>
          ) : (
            <div
              className="rounded-md border p-6 text-white/55 font-minecraft-ten text-sm"
              style={{ backgroundColor: "#121212cc", borderColor: `${accent}55` }}
            >
              <Icon icon="solar:ranking-bold" className="w-8 h-8 mb-2 text-white/40" />
              {t("survival.pick")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-sm border border-white/10 px-3 py-2">
      <p className="text-[10px] font-minecraft-ten uppercase tracking-wide text-white/40">{label}</p>
      <p className="font-minecraft text-2xl lowercase" style={{ color: color || "#fff" }}>
        {value}
      </p>
    </div>
  );
}
