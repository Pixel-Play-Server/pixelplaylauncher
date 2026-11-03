"use client";

import { type ComponentProps, lazy, Suspense, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";
import { MainLaunchButton } from "./MainLaunchButton";

const LazySkinCanvas = lazy(() =>
  import("./PlaySkinCanvas").then((m) => ({ default: m.PlaySkinCanvas })),
);

function PlaySkinCanvas(props: ComponentProps<typeof LazySkinCanvas>) {
  return (
    <Suspense fallback={<div style={{ width: props.width, height: props.height }} />}>
      <LazySkinCanvas {...props} />
    </Suspense>
  );
}
import { PlayerHeadshot } from "../account/PlayerHeadshot";
import { useThemeStore } from "../../store/useThemeStore";
import { useTranslation } from "react-i18next";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import AccountAddChoiceModal from "../account/AccountAddChoiceModal";

const BOUNCE_IN = "back.out(1.6)";
const GHOST_SCALE = 0.78;
const GHOST_HOVER_SCALE = 0.98;

interface PlayerActionsDisplayProps {
  playerName: string | null | undefined;
  launchButtonDefaultVersion: string;
  onLaunchVersionChange: (versionId: string) => void;
  launchButtonVersions: Array<{
    id: string;
    label: string;
    icon?: string;
    isCustom?: boolean;
    profileId: string;
  }>;
  className?: string;
  displayMode?: "playerName" | "logo";
}

export function PlayerActionsDisplay({
  playerName,
  launchButtonDefaultVersion,
  onLaunchVersionChange,
  launchButtonVersions,
  className,
  displayMode = "playerName",
}: PlayerActionsDisplayProps) {
  const { t } = useTranslation();
  const accentColor = useThemeStore((state) => state.accentColor);
  const { accounts, activeAccount, setActiveAccount, addAccount } =
    useMinecraftAuthStore();
  const { showModal, hideModal } = useGlobalModal();
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLDivElement>(null);
  const skipNameAnimRef = useRef(true);

  const otherAccounts = accounts.filter((a) => a.id !== activeAccount?.id);
  const leftAccount = otherAccounts[0] ?? null;
  const rightAccount = otherAccounts[1] ?? null;
  const extraAccounts = otherAccounts.slice(2);

  const openAddAccount = () => {
    showModal(
      "add-account",
      <AccountAddChoiceModal
        isOpen={true}
        modalWidth="sm"
        onClose={() => hideModal("add-account")}
        onMicrosoft={async () => {
          try {
            await addAccount();
            hideModal("add-account");
          } catch (err) {
            console.error("Error adding MS account from Play:", err);
          }
        }}
        onAccountCreated={async (createdId: string) => {
          try {
            if (createdId) {
              await setActiveAccount(createdId);
            }
            hideModal("add-account");
          } catch (err) {
            console.error("Error activating account from Play:", err);
          }
        }}
      />,
      1100,
    );
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: -18, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: BOUNCE_IN },
        );
      }
      if (centerRef.current) {
        gsap.fromTo(
          centerRef.current,
          { opacity: 0, y: 28, scale: 0.88 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            delay: 0.08,
            ease: BOUNCE_IN,
          },
        );
      }
      if (launchRef.current) {
        gsap.fromTo(
          launchRef.current,
          { opacity: 0, y: 22, scale: 0.92 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            delay: 0.22,
            ease: BOUNCE_IN,
          },
        );
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (skipNameAnimRef.current) {
      skipNameAnimRef.current = false;
      return;
    }
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0.45, y: 8, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: BOUNCE_IN },
      );
    }
    if (centerRef.current) {
      gsap.fromTo(
        centerRef.current,
        { opacity: 0.55, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.38, ease: BOUNCE_IN },
      );
    }
  }, [playerName]);

  const skinH = 470;
  const skinW = 260;
  const ghostW = 210;
  const ghostH = 400;
  const sideOffset = 156;

  const selectedVersionLabel = launchButtonVersions.find(
    (v) => v.id === launchButtonDefaultVersion,
  )?.label;

  return (
    <div
      ref={rootRef}
      className={cn("flex w-full flex-col items-center justify-center my-auto", className)}
    >
      <div ref={titleRef} className="relative z-30 mb-2">
        {displayMode === "logo" ? (
          <img
            src="pixelplay_logo_color.png"
            alt="pixelplay Logo"
            className="h-48 sm:h-56 md:h-64 relative z-0"
            style={{
              imageRendering: "pixelated",
              filter: `drop-shadow(2px 4px 6px ${accentColor.value})`,
            }}
          />
        ) : (
          <h2 className="font-minecraft text-6xl text-center text-white normal-case font-normal tracking-wide drop-shadow-md">
            {playerName || t("launcher.noProfileSelected")}
          </h2>
        )}
      </div>

      <div
        className="relative flex items-center justify-center"
        style={{
          width: Math.max(620, skinW + sideOffset * 2),
          height: skinH,
        }}
      >
        <SideGhostSkin
          side="left"
          offset={sideOffset}
          width={ghostW}
          height={ghostH}
          accountName={leftAccount?.minecraft_username || leftAccount?.username}
          accent={accentColor.value}
          label={
            leftAccount
              ? leftAccount.minecraft_username || leftAccount.username
              : t("accounts.addAccount")
          }
          ariaLabel={
            leftAccount
              ? t("accounts.switchTo", {
                  name:
                    leftAccount.minecraft_username || leftAccount.username,
                })
              : t("accounts.addAccount")
          }
          onClick={() =>
            leftAccount ? setActiveAccount(leftAccount.id) : openAddAccount()
          }
        />
        <SideGhostSkin
          side="right"
          offset={sideOffset}
          width={ghostW}
          height={ghostH}
          accountName={
            rightAccount?.minecraft_username || rightAccount?.username
          }
          accent={accentColor.value}
          label={
            rightAccount
              ? rightAccount.minecraft_username || rightAccount.username
              : t("accounts.addAccount")
          }
          ariaLabel={
            rightAccount
              ? t("accounts.switchTo", {
                  name:
                    rightAccount.minecraft_username || rightAccount.username,
                })
              : t("accounts.addAccount")
          }
          onClick={() =>
            rightAccount ? setActiveAccount(rightAccount.id) : openAddAccount()
          }
        />

        <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-[52%] pointer-events-none">
          <div ref={centerRef}>
            <PlaySkinCanvas
              playerName={playerName}
              width={skinW}
              height={skinH}
            />
          </div>
        </div>

        <div className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2">
          <div ref={launchRef}>
            <MainLaunchButton
              defaultVersion={launchButtonDefaultVersion}
              onVersionChange={onLaunchVersionChange}
              versions={launchButtonVersions}
              selectedVersionLabel={selectedVersionLabel}
              mainButtonWidth="w-80"
              maxWidth="400px"
              mainButtonHeight="h-20"
            />
          </div>
        </div>
      </div>

      {extraAccounts.length > 0 && (
        <div className="relative z-30 mt-1 flex items-center justify-center gap-2">
          {extraAccounts.map((account, index) => {
            const name =
              account.minecraft_username || account.username || "";
            return (
              <ExtraAccountChip
                key={account.id}
                name={name}
                accent={accentColor.value}
                delay={0.28 + index * 0.05}
                onClick={() => setActiveAccount(account.id)}
                ariaLabel={t("accounts.switchTo", { name })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SideGhostSkin({
  side,
  offset,
  width,
  height,
  accountName,
  accent,
  label,
  ariaLabel,
  onClick,
}: {
  side: "left" | "right";
  offset: number;
  width: number;
  height: number;
  accountName?: string | null;
  accent: string;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  const motionRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const x = side === "left" ? -offset : offset;
  const yaw = side === "left" ? -0.42 : 0.42;
  const isEmpty = !accountName;

  const skipSkinSwap = useRef(true);

  useEffect(() => {
    if (!btnRef.current) return;
    gsap.set(btnRef.current, {
      scale: GHOST_SCALE,
      opacity: 0.48,
      transformOrigin: "50% 100%",
    });
    if (!tagRef.current) return;
    gsap.set(tagRef.current, {
      opacity: 0,
      y: 10,
      scale: 0.86,
      xPercent: -50,
    });
  }, []);

  useEffect(() => {
    if (!motionRef.current) return;
    gsap.fromTo(
      motionRef.current,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay: side === "left" ? 0.06 : 0.16,
        ease: BOUNCE_IN,
      },
    );
  }, [side]);

  useEffect(() => {
    if (skipSkinSwap.current) {
      skipSkinSwap.current = false;
      return;
    }
    if (!btnRef.current) return;
    gsap.fromTo(
      btnRef.current,
      { opacity: 0.2, y: 8, scale: GHOST_SCALE },
      {
        opacity: 0.48,
        y: 0,
        scale: GHOST_SCALE,
        duration: 0.32,
        ease: "power2.out",
      },
    );
  }, [accountName]);

  const showTag = () => {
    setHovered(true);
    if (btnRef.current) {
      gsap.to(btnRef.current, {
        scale: GHOST_HOVER_SCALE,
        opacity: 0.96,
        duration: 0.34,
        ease: BOUNCE_IN,
        overwrite: "auto",
      });
    }
    if (tagRef.current) {
      gsap.fromTo(
        tagRef.current,
        { opacity: 0, y: 12, scale: 0.82, xPercent: -50 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          xPercent: -50,
          duration: 0.32,
          ease: BOUNCE_IN,
          overwrite: "auto",
        },
      );
    }
  };

  const hideTag = () => {
    setHovered(false);
    if (btnRef.current) {
      gsap.to(btnRef.current, {
        scale: GHOST_SCALE,
        opacity: 0.48,
        duration: 0.22,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    }
    if (tagRef.current) {
      gsap.to(tagRef.current, {
        opacity: 0,
        y: 8,
        scale: 0.9,
        xPercent: -50,
        duration: 0.16,
        ease: "power2.in",
        overwrite: "auto",
      });
    }
  };

  return (
    <div
      className="absolute top-1/2 left-1/2 z-10"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, -12px)`,
      }}
    >
      <div ref={motionRef} className="relative">
      <span
        ref={tagRef}
        className="pointer-events-none absolute z-40 whitespace-nowrap rounded-md px-3 py-1 font-minecraft text-xl normal-case tracking-wide text-white"
        style={{
          top: 6,
          left: "50%",
          backgroundColor: `${accent}CC`,
          border: `2px solid ${accent}`,
          boxShadow: `0 4px 0 rgba(0,0,0,0.25), 0 8px 16px ${accent}40`,
          textShadow: "0 2px 0 rgba(0,0,0,0.45)",
        }}
      >
        {label}
      </span>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        onMouseEnter={showTag}
        onMouseLeave={hideTag}
        onFocus={showTag}
        onBlur={hideTag}
        className={cn(
          "group/ghost relative block origin-bottom cursor-pointer border-0 bg-transparent p-0",
          "focus-visible:outline-none",
          "transition-[filter] duration-300 ease-out",
          hovered
            ? "grayscale-[0.08] saturate-[0.85]"
            : "grayscale-[0.55] saturate-[0.35]",
        )}
      >
        <span
          className="pointer-events-none absolute inset-x-8 bottom-6 h-8 rounded-full blur-md transition-opacity duration-300"
          style={{
            background: `${accent}55`,
            opacity: hovered ? 0.7 : 0,
          }}
        />
        <PlaySkinCanvas
          playerName={isEmpty ? null : accountName}
          width={width}
          height={height}
          yaw={yaw}
          ghost
          paused={!hovered}
        />
      </button>
      </div>
    </div>
  );
}

function ExtraAccountChip({
  name,
  accent,
  delay,
  onClick,
  ariaLabel,
}: {
  name: string;
  accent: string;
  delay: number;
  onClick: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 10, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, delay, ease: BOUNCE_IN },
    );
    if (tagRef.current) {
      gsap.set(tagRef.current, { opacity: 0, y: 6, xPercent: -50 });
    }
  }, [delay]);

  const show = () => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      scale: 1.12,
      duration: 0.28,
      ease: BOUNCE_IN,
      overwrite: "auto",
    });
    if (tagRef.current) {
      gsap.to(tagRef.current, {
        opacity: 1,
        y: 0,
        xPercent: -50,
        duration: 0.28,
        ease: BOUNCE_IN,
        overwrite: "auto",
      });
    }
  };

  const hide = () => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      scale: 1,
      duration: 0.18,
      ease: "power2.inOut",
      overwrite: "auto",
    });
    if (tagRef.current) {
      gsap.to(tagRef.current, {
        opacity: 0,
        y: 6,
        xPercent: -50,
        duration: 0.14,
        ease: "power2.in",
        overwrite: "auto",
      });
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="relative h-10 w-10 overflow-visible rounded-md border-2 bg-black/40"
      style={{ borderColor: `${accent}80` }}
    >
      <span
        ref={tagRef}
        className="pointer-events-none absolute bottom-full z-40 mb-2 whitespace-nowrap rounded-md px-2 py-0.5 font-minecraft text-lg normal-case text-white"
        style={{
          left: "50%",
          backgroundColor: `${accent}CC`,
          border: `2px solid ${accent}`,
        }}
      >
        {name}
      </span>
      <span className="block h-full w-full overflow-hidden rounded-[4px]">
        <PlayerHeadshot playerName={name} size={40} alt={name} />
      </span>
    </button>
  );
}
