"use client";

import { Icon } from "@iconify/react";
import { cn } from "../../lib/utils";
import { useThemeStore } from "../../store/useThemeStore";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { PlayerHeadshot } from "./PlayerHeadshot";
import { RankTag } from "./RankTag";
import { useTranslation } from "react-i18next";
import { rankInfo, presenceInfo } from "../../lib/pixel-rank";
import { usePresenceStore } from "../../store/presence-store";

interface CurrentAccountDisplayProps {
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  variant?: "default" | "flat";
}

export function CurrentAccountDisplay({
  onClick,
  className,
  compact = false,
  variant = "flat",
}: CurrentAccountDisplayProps) {
  const { t } = useTranslation();
  const { activeAccount } = useMinecraftAuthStore();
  const accentColor = useThemeStore((state) => state.accentColor);
  const presenceStatus = usePresenceStore((s) => s.status);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (buttonRef.current) {
      gsap.fromTo(
        buttonRef.current,
        { scale: 0.95, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        },
      );
    }
  }, []);

  // Get border classes based on variant
  const getBorderClasses = () => {
    if (variant === "flat") {
      return "border border-b-2";
    }
    return "border-2 border-b-4";
  };

  // Get box shadow based on variant
  const getBoxShadow = () => {
    if (variant === "flat") {
      return "none";
    }
    return `0 8px 0 rgba(0,0,0,0.3), 0 10px 15px rgba(0,0,0,0.35), inset 0 1px 0 ${accentColor.value}40, inset 0 0 0 1px ${accentColor.value}20`;
  };

  // Get hover box shadow based on variant
  const getHoverBoxShadow = () => {
    if (variant === "flat") {
      return "none";
    }
    return "0 10px 0 rgba(0,0,0,0.25), 0 12px 20px rgba(0,0,0,0.4)";
  };

  // Get active box shadow based on variant
  const getActiveBoxShadow = () => {
    if (variant === "flat") {
      return "none";
    }
    return "0 2px 0 rgba(0,0,0,0.2), 0 3px 5px rgba(0,0,0,0.3)";
  };

  // Get hover transform based on variant
  const getHoverTransform = () => {
    if (variant === "flat") {
      return "";
    }
    return "hover:translate-y-[-2px]";
  };

  // Get active transform based on variant
  const getActiveTransform = () => {
    if (variant === "flat") {
      return "";
    }
    return "active:translate-y-[2px] active:border-b-2";
  };

  // Get border bottom color based on variant and hover state
  const getBorderBottomColor = () => {
    if (variant === "flat") {
      return isHovered ? accentColor.hoverValue : accentColor.value;
    }
    return accentColor.value;
  };

  if (!activeAccount) {
    return (
      <div
        ref={buttonRef}
        className={cn(
          "font-minecraft relative overflow-hidden backdrop-blur-md transition-all duration-200",
          "rounded-md text-white tracking-wider",
          "flex items-center gap-3 px-4 py-1",
          "text-shadow-sm",
          getBorderClasses(),
          variant !== "flat" &&
            "shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
          "cursor-pointer",
          getHoverTransform(),

          "hover:brightness-110",
          getActiveTransform(),

          "active:brightness-90",
          className,
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: `${accentColor.value}30`,
          borderColor: `${accentColor.value}80`,
          borderBottomColor: getBorderBottomColor(),
          boxShadow: getBoxShadow(),
          filter: isHovered ? "brightness(1.1)" : "brightness(1)",
        }}
      >
        {variant !== "flat" && (
          <span
            className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
            style={{
              backgroundColor: isHovered
                ? accentColor.hoverValue
                : `${accentColor.value}80`,
            }}
          />
        )}

        <span className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 bg-gradient-radial from-white/30 via-transparent to-transparent" />

        <div
          className="relative w-6 h-6 border rounded-sm flex-shrink-0 flex items-center justify-center"
        title={t("accounts.addAccount")}
          style={{
            borderColor: `${accentColor.value}60`,
            backgroundColor: `${accentColor.value}20`,
          }}
        >
          <span className="text-white font-minecraft text-xs">+</span>
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xl text-white font-minecraft normal-case">
            {t("accounts.addAccount")}
          </span>
        </div>

        <Icon
          icon="solar:alt-arrow-down-bold"
          className="w-4 h-4 text-white/90 ml-1 flex-shrink-0"
        />
      </div>
    );
  }

  const username =
    activeAccount.minecraft_username || activeAccount.username || t("accounts.unknown");
  const info = rankInfo(
    activeAccount.rank,
    activeAccount.pixel_account,
    activeAccount.rank_label,
    activeAccount.rank_color,
  );
  const borderColor = info?.color || accentColor.value;
  const status = activeAccount.pixel_account
    ? presenceInfo(presenceStatus)
    : null;

  return (
    <div
      ref={buttonRef}
      className={cn(
        "font-minecraft relative overflow-visible backdrop-blur-md transition-all duration-200",
        "rounded-md text-white tracking-wider",
        "flex items-center gap-2 px-3 h-10",
        "text-shadow-sm",
        getBorderClasses(),
        variant !== "flat" &&
          "shadow-[0_8px_0_rgba(0,0,0,0.3),0_10px_15px_rgba(0,0,0,0.35)]",
        "cursor-pointer",
        getHoverTransform(),

        "hover:brightness-110",
        getActiveTransform(),

        "active:brightness-90",
        "max-w-[260px]",
        className,
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: `${accentColor.value}30`,
        borderColor: `${accentColor.value}80`,
        borderBottomColor: variant === "flat"
          ? isHovered
            ? accentColor.hoverValue
            : `${accentColor.value}cc`
          : accentColor.value,
        boxShadow: getBoxShadow(),
        filter: isHovered ? "brightness(1.1)" : "brightness(1)",
      }}
    >
      {variant !== "flat" && (
        <span
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm"
          style={{
            backgroundColor: isHovered ? accentColor.hoverValue : `${accentColor.value}80`,
          }}
        />
      )}

      <span className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 bg-gradient-radial from-white/30 via-transparent to-transparent" />

      <div
        className="relative w-6 h-6 border rounded-sm flex-shrink-0 flex items-center justify-center"
        title={status ? t(`friends.status.${status.key}`) : username}
        style={{
          borderColor: `${accentColor.value}90`,
          backgroundColor: `${accentColor.value}20`,
        }}
      >
        <PlayerHeadshot
          playerName={username}
          size={24}
          alt={t("accounts.avatarAlt", { name: username })}
        />
        {status && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black"
            style={{ backgroundColor: status.color }}
          />
        )}
      </div>

      {!compact && (
        <div className="flex flex-1 items-center min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm text-white font-minecraft-ten truncate leading-tight"
              title={username}
            >
              {username}
            </span>
            <RankTag
              rank={activeAccount.rank}
              pixelAccount={activeAccount.pixel_account}
              rankLabel={activeAccount.rank_label}
              rankColor={activeAccount.rank_color}
              className="!px-1 !py-0.5 !text-[10px]"
            />
          </div>

        </div>
      )}

      <Icon
        icon="solar:alt-arrow-down-bold"
        className="w-4 h-4 text-white/90 ml-1 flex-shrink-0"
      />
    </div>
  );
}
