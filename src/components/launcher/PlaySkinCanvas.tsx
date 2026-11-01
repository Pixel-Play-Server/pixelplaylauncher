"use client";

import { useEffect, useRef } from "react";
import * as skinview3d from "skinview3d";
import { cn } from "../../lib/utils";
import { MinecraftSkinService } from "../../services/minecraft-skin-service";

interface PlaySkinCanvasProps {
  playerName?: string | null;
  width?: number;
  height?: number;
  className?: string;
  dimmed?: boolean;
  interactive?: boolean;
  paused?: boolean;
  yaw?: number;
  ghost?: boolean;
}

const STEVE_SKIN = "https://mc-heads.net/skin/MHF_Steve";
const textureCache = new Map<string, string>();

function toDataUrl(b64: string): string {
  const raw = b64.replace(/^data:image\/png;base64,/i, "").trim();
  return `data:image/png;base64,${raw}`;
}

function applyWalkPose(player: skinview3d.PlayerObject, progress: number) {
  const t = progress * 8;
  player.skin.leftLeg.rotation.x = Math.sin(t) * 0.95;
  player.skin.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.95;
  player.skin.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.55;
  player.skin.rightArm.rotation.x = Math.sin(t) * 0.55;
  player.skin.leftArm.rotation.z = Math.cos(t) * 0.05 + 0.1;
  player.skin.rightArm.rotation.z = Math.cos(t + Math.PI) * 0.05 - 0.1;
  player.skin.head.rotation.y = Math.sin(t / 4) * 0.1;
}

async function resolveSkinTexture(playerName?: string | null): Promise<string> {
  const name = playerName?.trim();
  if (!name) return resolveDefaultSteve();
  const cached = textureCache.get(name.toLowerCase());
  if (cached) return cached;

  try {
    const b64 = await MinecraftSkinService.getBase64FromSkinSource({
      type: "Profile",
      details: { query: name },
    });
    if (b64) {
      const url = toDataUrl(b64);
      textureCache.set(name.toLowerCase(), url);
      return url;
    }
  } catch (err) {
    console.warn("[PlaySkinCanvas] profile skin failed", name, err);
  }

  try {
    const b64 = await MinecraftSkinService.getBase64FromSkinSource({
      type: "Url",
      details: { url: `https://mc-heads.net/skin/${encodeURIComponent(name)}` },
    });
    if (b64) {
      const url = toDataUrl(b64);
      textureCache.set(name.toLowerCase(), url);
      return url;
    }
  } catch (err) {
    console.warn("[PlaySkinCanvas] mc-heads skin failed", name, err);
  }

  return `https://mc-heads.net/skin/${encodeURIComponent(name)}`;
}

async function resolveDefaultSteve(): Promise<string> {
  const cached = textureCache.get("__steve__");
  if (cached) return cached;
  const urls = [
    "https://mc-heads.net/skin/MHF_Steve",
    "https://mc-heads.net/skin/Steve",
    "https://crafatar.com/skins/8667ba71b85a4004af54457a9734eed7",
    STEVE_SKIN,
  ];
  for (const url of urls) {
    try {
      const b64 = await MinecraftSkinService.getBase64FromSkinSource({
        type: "Url",
        details: { url },
      });
      if (b64) {
        const dataUrl = toDataUrl(b64);
        textureCache.set("__steve__", dataUrl);
        return dataUrl;
      }
    } catch {
      // try next source
    }
  }
  return STEVE_SKIN;
}

export function PlaySkinCanvas({
  playerName,
  width = 240,
  height = 450,
  className,
  dimmed = false,
  interactive = false,
  paused = false,
  yaw = 0.48,
  ghost = false,
}: PlaySkinCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const walk = new skinview3d.FunctionAnimation((player, progress) => {
      applyWalkPose(player, progress);
    });
    walk.speed = ghost ? 0.55 : 0.7;
    walk.progress = 0.2;

    const viewer = new skinview3d.SkinViewer({
      canvas,
      width,
      height,
      preserveDrawingBuffer: true,
      enableControls: interactive,
      animation: walk,
      zoom: ghost ? 0.82 : 0.86,
      fov: ghost ? 38 : 40,
    });
    viewer.globalLight.intensity = ghost ? 1.85 : 2.85;
    viewer.cameraLight.intensity = ghost ? 0.35 : 0.62;
    viewer.controls.enableRotate = interactive;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;
    viewer.autoRotate = false;
    if (viewer.playerObject) {
      viewer.playerObject.rotation.y = yaw;
    }
    viewerRef.current = viewer;

    void (async () => {
      const texture = await resolveSkinTexture(playerName);
      if (cancelled || viewer.disposed) return;
      try {
        await viewer.loadSkin(texture, { model: "auto-detect" });
      } catch (err) {
        console.warn("[PlaySkinCanvas] loadSkin failed, using Steve", err);
        if (!cancelled && !viewer.disposed) {
          const steve = await resolveDefaultSteve();
          if (!cancelled && !viewer.disposed) {
            await viewer.loadSkin(steve, { model: "default" });
          }
        }
      }
      if (!cancelled && viewer.playerObject) {
        viewer.playerObject.rotation.y = yaw;
        applyWalkPose(viewer.playerObject, walk.progress);
      }
      if (!cancelled && !viewer.disposed) {
        viewer.renderPaused = pausedRef.current;
        if (pausedRef.current) viewer.render();
      }
    })();

    return () => {
      cancelled = true;
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [playerName, width, height, interactive, yaw, ghost]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.disposed) return;
    viewer.renderPaused = paused;
    if (paused) viewer.render();
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("block select-none", dimmed && "opacity-75", className)}
      style={{ width, height }}
    />
  );
}
