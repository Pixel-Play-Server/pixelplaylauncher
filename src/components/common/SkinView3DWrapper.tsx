"use client";

import React, { useEffect, useRef } from "react";
import * as skinview3d from "skinview3d";
import { cn } from "../../lib/utils";

interface SkinView3DWrapperProps {
  skinUrl?: string | null;
  capeUrl?: string | null;
  skinVariant?: "classic" | "slim";
  className?: string;
  width?: number;
  height?: number;
  enableAutoRotate?: boolean;
  zoom?: number;
  displayAsElytra?: boolean;
  onPaintPixel?: (x: any, y: any) => void;
  autoRotateSpeed?: number;
  startFromBack?: boolean;
  animation?: "idle" | "walk" | "fly";
  transparent?: boolean;
  pixelRatio?: number | "match-device";
  fxaa?: boolean;
}

export const DEFAULT_STEVE_SKIN_URL = "https://mc-heads.net/skin/Steve";

const getModelType = (variant: "classic" | "slim" = "classic") => {
  return variant === "slim" ? "slim" : "default";
};

async function loadSkinSafe(
  viewer: skinview3d.SkinViewer,
  url: string | null | undefined,
  variant: "classic" | "slim",
) {
  if (url === null) {
    viewer.loadSkin(null);
    return;
  }
  const modelType = getModelType(variant);
  const candidates = [url, DEFAULT_STEVE_SKIN_URL].filter(
    (item, index, all): item is string => Boolean(item) && all.indexOf(item) === index,
  );
  for (const candidate of candidates) {
    try {
      await viewer.loadSkin(candidate, { model: modelType });
      return;
    } catch {
      /* siguiente fallback */
    }
  }
}

export const SkinView3DWrapper: React.FC<SkinView3DWrapperProps> = ({
  skinUrl,
  capeUrl,
  skinVariant = "classic",
  className,
  width: propWidth,
  height: propHeight,
  enableAutoRotate = false,
  zoom = 1.0,
  displayAsElytra = false,
  autoRotateSpeed = 1.0,
  startFromBack = false,
  animation = "idle",
  transparent = false,
  pixelRatio = "match-device",
  fxaa = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skinViewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) {
      return () => {};
    }

    const determineWidth = propWidth || containerRef.current.offsetWidth || 300;
    const determineHeight = propHeight || containerRef.current.offsetHeight || 400;

    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: determineWidth,
      height: determineHeight,
      pixelRatio,
    });
    if (transparent) {
      viewer.background = null;
    }
    if (!fxaa && viewer.fxaaPass) {
      viewer.fxaaPass.enabled = false;
    }
    skinViewerRef.current = viewer;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!skinViewerRef.current) {
        return;
      }
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!propWidth) {
          skinViewerRef.current.width = width;
        }
        if (!propHeight) {
          skinViewerRef.current.height = height;
        }
      }
    });

    if (!propWidth || !propHeight) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      viewer.dispose();
      skinViewerRef.current = null;
    };
  }, [propWidth, propHeight, transparent, pixelRatio, fxaa]);

  useEffect(() => {
    const viewer = skinViewerRef.current;
    if (!viewer) {
      return;
    }
    void loadSkinSafe(viewer, skinUrl, skinVariant);
  }, [skinUrl, skinVariant]);

  useEffect(() => {
    const viewer = skinViewerRef.current;
    if (!viewer) {
      return;
    }
    if (!capeUrl) {
      viewer.loadCape(null);
      return;
    }
    void viewer
      .loadCape(capeUrl, displayAsElytra ? { backEquipment: "elytra" } : undefined)
      .catch(() => viewer.loadCape(null));
  }, [capeUrl, displayAsElytra]);

  useEffect(() => {
    const viewer = skinViewerRef.current;
    if (!viewer) {
      return;
    }
    if (animation === "fly") {
      viewer.animation = new skinview3d.FlyingAnimation();
      viewer.animation.speed = 0.7;
    } else if (animation === "walk") {
      viewer.animation = new skinview3d.WalkingAnimation();
      viewer.animation.speed = 0.85;
    } else {
      viewer.animation = new skinview3d.IdleAnimation();
    }
  }, [animation]);

  useEffect(() => {
    const viewer = skinViewerRef.current;
    if (!viewer) {
      return;
    }
    viewer.autoRotate = enableAutoRotate;
    if (enableAutoRotate) {
      viewer.autoRotateSpeed = autoRotateSpeed;
    }
    if (startFromBack && viewer.playerObject) {
      viewer.playerObject.rotation.y = Math.PI;
    }
  }, [enableAutoRotate, autoRotateSpeed, startFromBack]);

  useEffect(() => {
    if (skinViewerRef.current) {
      skinViewerRef.current.zoom = zoom;
    }
  }, [zoom]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center justify-center",
        !propWidth || !propHeight ? "h-full w-full" : "",
        className,
      )}
      style={
        propWidth && propHeight
          ? { width: propWidth, height: propHeight }
          : undefined
      }
    >
      <canvas ref={canvasRef} style={{ display: "block", background: "transparent" }} />
    </div>
  );
};
