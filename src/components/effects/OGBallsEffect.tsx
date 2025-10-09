"use client";

import React from "react";
import { useThemeStore } from "../../store/useThemeStore";
import { useWindowFocus } from "../../hooks/useWindowFocus";

interface OGBallsEffectProps {
  opacity?: number;
  speed?: number; // higher = faster
  className?: string;
  forceEnable?: boolean;
}

export function OGBallsEffect({
  opacity = 0.35,
  speed = 1,
  className = "",
  forceEnable = false,
}: OGBallsEffectProps) {
  const staticBackground = useThemeStore((s) => s.staticBackground);
  const isBackgroundAnimationEnabled = useThemeStore((s) => s.isBackgroundAnimationEnabled);
  const isWindowFocused = useWindowFocus();

  const isAnimating = forceEnable || (!staticBackground && isBackgroundAnimationEnabled);
  const shouldAnimate = isAnimating && isWindowFocused;

  const leftDuration = `${16 / Math.max(0.25, speed)}s`;
  const rightDuration = `${20 / Math.max(0.25, speed)}s`;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className} og-balls-wrapper`} aria-hidden>
      <style>{`
        .og-balls-wrapper { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
        .og-ball { position: absolute; width: 480px; height: 480px; border-radius: 50%; filter: blur(40px); opacity: ${opacity}; pointer-events: none; mix-blend-mode: screen; }
        .og-ball-left { left: -12%; top: -8%; background: radial-gradient(circle at 30% 30%, var(--primary-color-light, #4be08c) 0%, var(--primary-color, #2ecc71) 30%, transparent 60%); animation: og-rotate-left ${leftDuration} linear infinite; }
        .og-ball-right { right: -10%; bottom: -12%; background: radial-gradient(circle at 60% 60%, #2752c1 0%, rgba(39,82,193,0.9) 25%, transparent 60%); animation: og-rotate-right ${rightDuration} linear infinite; }
        @keyframes og-rotate-left {
          0% { transform: translate(0,0) rotate(0deg) scale(1); }
          25% { transform: translate(6%,4%) rotate(90deg) scale(1.05); }
          50% { transform: translate(0,8%) rotate(180deg) scale(1.1); }
          75% { transform: translate(-6%,4%) rotate(270deg) scale(1.05); }
          100% { transform: translate(0,0) rotate(360deg) scale(1); }
        }
        @keyframes og-rotate-right {
          0% { transform: translate(0,0) rotate(0deg) scale(1); }
          25% { transform: translate(-5%,-4%) rotate(-90deg) scale(1.03); }
          50% { transform: translate(0,-10%) rotate(-180deg) scale(1.08); }
          75% { transform: translate(5%,-4%) rotate(-270deg) scale(1.03); }
          100% { transform: translate(0,0) rotate(-360deg) scale(1); }
        }
        .og-balls-paused { animation-play-state: paused !important; opacity: ${Math.max(0.2, opacity * 0.6)} !important; filter: blur(60px) !important; }
      `}</style>

      <div className={`og-ball og-ball-left ${!shouldAnimate ? "og-balls-paused" : ""}`} style={{}} />
      <div className={`og-ball og-ball-right ${!shouldAnimate ? "og-balls-paused" : ""}`} style={{}} />
    </div>
  );
}

export default OGBallsEffect;
