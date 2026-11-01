"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { resolvePlayerHeadshot } from "../../utils/minecraft-headshot";

interface PlayerHeadshotProps {
  playerName?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

export function PlayerHeadshot({
  playerName,
  size = 28,
  className,
  alt,
}: PlayerHeadshotProps) {
  const [src, setSrc] = useState<string | null>(null);
  const letter = (playerName?.trim().charAt(0) || "?").toUpperCase();
  const label = playerName?.trim() || "";

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    resolvePlayerHeadshot(playerName, Math.max(32, size * 2))
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [playerName, size]);

  if (!src) {
    return (
      <span
        title={label || undefined}
        className={cn(
          "flex h-full w-full items-center justify-center font-minecraft text-xs text-white",
          className,
        )}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt || playerName || "skin"}
      title={label || undefined}
      className={cn("h-full w-full object-cover", className)}
      style={{ imageRendering: "pixelated" }}
      draggable={false}
    />
  );
}
