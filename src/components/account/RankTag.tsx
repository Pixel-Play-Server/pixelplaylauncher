"use client";

import { rankInfo } from "../../lib/pixel-rank";

export function RankTag({
  rank,
  pixelAccount,
  rankLabel,
  rankColor,
  className = "",
}: {
  rank?: string | null;
  pixelAccount?: boolean;
  rankLabel?: string | null;
  rankColor?: string | null;
  className?: string;
}) {
  const info = rankInfo(rank, pixelAccount, rankLabel, rankColor);
  if (!info) {
    return null;
  }
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-[3px] text-[11px] leading-none font-minecraft-ten rounded-sm border whitespace-nowrap shrink-0 ${className}`}
      style={{
        color: info.color,
        borderColor: `${info.color}aa`,
        backgroundColor: `${info.color}24`,
      }}
    >
      {info.label}
    </span>
  );
}
