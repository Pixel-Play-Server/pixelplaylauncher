"use client";

import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface SkinViewerProps {
  skinUrl: string;
  playerName?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SkinViewer({
  skinUrl,
  playerName,
  width = 300,
  height = 400,
  className,
  style,
}: SkinViewerProps) {
  const [src, setSrc] = useState(skinUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setSrc(skinUrl);
    setHasError(false);
  }, [skinUrl]);

  const handleError = () => {
    if (playerName && src && !src.includes("mc-heads.net")) {
      setSrc(`https://mc-heads.net/body/${encodeURIComponent(playerName)}`);
      return;
    }
    setHasError(true);
  };

  if (hasError || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-700/50 rounded-md",
          className,
        )}
        style={{ width, height, ...style }}
      >
        <span className="text-gray-500 text-3xl">?</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={playerName ? `${playerName}'s Skin` : "Minecraft Skin"}
      width={width}
      height={height}
      className={cn("object-contain rounded-md select-none", className)}
      style={{
        imageRendering: "pixelated",
        userSelect: "none",
        ...style,
      }}
      draggable={false}
      onError={handleError}
    />
  );
}
