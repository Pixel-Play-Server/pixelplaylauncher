"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface CapeImageProps {
  imageUrl: string | undefined;
  part?: "front" | "back";
  width?: number;
  className?: string;
}

/** Vanilla cape UV in 64×32 space. HD sheets (128×64, 512×256, …) scale uniformly. */
const CAPE_UV = {
  front: { x: 1, y: 1, w: 10, h: 16 },
  back: { x: 11, y: 1, w: 10, h: 16 },
} as const;

function isCapeSheet(width: number, height: number): boolean {
  return width >= 64 && height >= 32 && width / height >= 1.6 && width / height <= 2.4;
}

export const CapeImage = React.memo(function CapeImage({
  imageUrl,
  part = "front",
  width = 60,
  className,
}: CapeImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const uv = CAPE_UV[part];
  const height = useMemo(() => Math.round(width * (uv.h / uv.w)), [width, uv.h, uv.w]);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsLoading(false);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    const onLoad = () => {
      if (!canvasRef.current) {
        setErrorMessage("Canvas lost before drawing.");
        setIsLoading(false);
        return;
      }
      const currentCtx = canvasRef.current.getContext("2d");
      if (!currentCtx) {
        setErrorMessage("Failed to get canvas context for drawing.");
        setIsLoading(false);
        return;
      }

      try {
        const tw = img.naturalWidth || img.width;
        const th = img.naturalHeight || img.height;

        currentCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        currentCtx.imageSmoothingEnabled = false;

        if (isCapeSheet(tw, th)) {
          const scaleX = tw / 64;
          const scaleY = th / 32;
          currentCtx.drawImage(
            img,
            uv.x * scaleX,
            uv.y * scaleY,
            uv.w * scaleX,
            uv.h * scaleY,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        } else {
          currentCtx.drawImage(
            img,
            0,
            0,
            tw,
            th,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        }
        setErrorMessage(null);
      } catch (drawError) {
        console.error("[CapeImage] Error drawing cape part:", drawError);
        setErrorMessage("Error rendering cape part.");
      } finally {
        setIsLoading(false);
      }
    };

    const onError = (error: string | Event) => {
      console.error("[CapeImage] Failed to load cape image:", imageUrl, error);
      setErrorMessage("Failed to load cape image.");
      setIsLoading(false);
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);

    return () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [imageUrl, part, width, height, uv.x, uv.y, uv.w, uv.h]);

  return (
    <div
      className={cn("cape-image-container relative inline-block align-middle overflow-hidden", className)}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {errorMessage ? (
        <div
          className="error-message w-full h-full flex justify-center items-center text-center text-xs text-red-600 bg-red-100 border border-red-600 p-1 box-border"
          title={errorMessage}
        >
          ⚠️ Error
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            "cape-canvas block w-full h-full transition-opacity duration-300 ease-in-out",
            isLoading && !errorMessage ? "opacity-0" : "opacity-100",
          )}
          title={`Cape ${part} view`}
          style={{
            backgroundColor: "transparent",
            imageRendering: "pixelated",
          }}
        />
      )}
    </div>
  );
});
