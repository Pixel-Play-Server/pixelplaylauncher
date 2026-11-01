"use client";

import type React from "react";
import { type ReactNode, lazy, Suspense, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Icon } from "@iconify/react";

import { VerticalNavbar } from ".././navigation/VerticalNavbar";
import { UserProfileBar } from ".././header/UserProfileBar";
import { NavigationHistory } from "../ui/NavigationHistory";
import { useThemeStore } from "../../store/useThemeStore";
import {
  BACKGROUND_EFFECTS,
  useBackgroundEffectStore,
} from "../../store/background-effect-store";
import { useQualitySettingsStore } from "../../store/quality-settings-store";
import * as ConfigService from "../../services/launcher-config-service";
import { SocialsModal } from "../modals/SocialsModal";
import { ProfileWizardV2Modal } from "../modals/ProfileWizardV2Modal";
import { ProfileSettingsModal } from "../modals/ProfileSettingsModal";
import { ProfileDuplicateModal } from "../modals/ProfileDuplicateModal";
import { exit, relaunch } from '@tauri-apps/plugin-process';
import { useTranslation } from "react-i18next";

const MatrixRainEffect = lazy(() => import("../effects/MatrixRainEffect").then((m) => ({ default: m.MatrixRainEffect })));
const EnchantmentParticlesEffect = lazy(() => import("../effects/EnchantmentParticlesEffect").then((m) => ({ default: m.EnchantmentParticlesEffect })));
const NebulaWaves = lazy(() => import("../effects/NebulaWaves").then((m) => ({ default: m.NebulaWaves })));
const NebulaParticles = lazy(() => import("../effects/NebulaParticles").then((m) => ({ default: m.NebulaParticles })));
const NebulaGrid = lazy(() => import("../effects/NebulaGrid").then((m) => ({ default: m.NebulaGrid })));
const NebulaVoxels = lazy(() => import("../effects/NebulaVoxels").then((m) => ({ default: m.NebulaVoxels })));
const NebulaLightning = lazy(() => import("../effects/NebulaLightning").then((m) => ({ default: m.NebulaLightning })));
const NebulaLiquidChrome = lazy(() => import("../effects/NebulaLiquidChrome").then((m) => ({ default: m.NebulaLiquidChrome })));
const PlainBackground = lazy(() => import("../effects/PlainBackground"));
const OGBallsEffect = lazy(() => import("../effects/OGBallsEffect").then((m) => ({ default: m.OGBallsEffect })));
const OGBothEffect = lazy(() => import("../effects/OGBothEffect").then((m) => ({ default: m.OGBothEffect })));

const appConfig = {
  version: "v6.0.0",
};

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onNavChange: (tabId: string) => void;
}

export function AppLayout({
  children,
  activeTab,
  onNavChange,
}: AppLayoutProps) {
  const launcherRef = useRef<HTMLDivElement>(null);
  const minimizeRef = useRef<HTMLDivElement>(null);
  const maximizeRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const { currentEffect } = useBackgroundEffectStore();
  const { qualityLevel } = useQualitySettingsStore();
  const { isBackgroundAnimationEnabled, accentColor: themeAccentColor } = useThemeStore();
  const { t } = useTranslation();
  const navItems = [
    { id: "play", icon: "solar:play-bold", label: t("navigation.play") },
    { id: "profiles", icon: "solar:user-id-bold", label: t("navigation.profiles") },
    { id: "mods", icon: "solar:widget-bold", label: t("navigation.mods") },
    { id: "skins", icon: "solar:emoji-funny-circle-bold", label: t("navigation.skins") },
    { id: "friends", icon: "solar:users-group-rounded-bold", label: t("navigation.friends") },
    { id: "settings", icon: "solar:settings-bold", label: t("navigation.settings") },
  ];

  const getComplementaryBackground = () => {
    // Deep near-black shell — avoid muddy mid-grey from accent*0.1
    return "#0a0a0c";
  };

  const backgroundColor = getComplementaryBackground();
  const accent = themeAccentColor.value;
  const getQualityParams = () => {
    switch (qualityLevel) {
      case "low":
        return { particleCount: 30, opacity: 0.2, speed: 0.5 };
      case "high":
        return { particleCount: 80, opacity: 0.4, speed: 1.5 };
      default:
        return { particleCount: 50, opacity: 0.3, speed: 1 };
    }
  };

  const qualityParams = getQualityParams();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(launcherRef.current, {
        opacity: 0,
        scale: 0.985,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    const setupWindowControls = async () => {
      try {
        const tauriModule = await import("@tauri-apps/api/window").catch(
          () => null,
        );

        if (tauriModule) {
          const { Window } = tauriModule;
          const currentWindow = Window.getCurrent();

          if (minimizeRef.current) {
            minimizeRef.current.addEventListener("click", () =>
              currentWindow.minimize(),
            );
          }

          if (maximizeRef.current) {
            maximizeRef.current.addEventListener("click", () =>
              currentWindow.toggleMaximize(),
            );
          }

          if (closeRef.current) {
            closeRef.current.addEventListener("click", () =>
              exit(0),
            );
          }
        } else {
          console.log(
            "Tauri API not available, window controls will be decorative only",
          );
        }
      } catch (error) {
        console.error("Failed to initialize window controls:", error);
      }
    };

    setupWindowControls();

    return () => ctx.revert();
  }, []);

  const renderBackgroundEffect = () => {
    switch (currentEffect) {
      case BACKGROUND_EFFECTS.MATRIX_RAIN:
        return (
          <MatrixRainEffect
            speed={qualityParams.speed}
            opacity={qualityParams.opacity}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.ENCHANTMENT_PARTICLES:
        return (
          <EnchantmentParticlesEffect
            opacity={qualityParams.opacity}
            particleCount={qualityParams.particleCount}
            speed={qualityParams.speed}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_WAVES:
        return (
          <NebulaWaves
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_PARTICLES:
        return (
          <NebulaParticles
            opacity={qualityParams.opacity}
            particleCount={qualityParams.particleCount}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_GRID:
        return (
          <NebulaGrid
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
            gridSize={30}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_VOXELS:
        return (
          <NebulaVoxels
            opacity={qualityParams.opacity}
            cubeCount={qualityParams.particleCount}
            speed={qualityParams.speed}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_LIGHTNING:
        return (
          <NebulaLightning
            opacity={qualityParams.opacity * 2}
            speed={qualityParams.speed}
            intensity={qualityParams.speed * 1.2}
            size={1.5}
          />
        );
      case BACKGROUND_EFFECTS.NEBULA_LIQUID_CHROME:
        return (
          <NebulaLiquidChrome
            opacity={qualityParams.opacity * 2}
            speed={qualityParams.speed * 0.2}
            amplitude={0.5}
            frequencyX={3}
            frequencyY={2}
          />
        );
      case BACKGROUND_EFFECTS.RETRO_GRID:
        const hexToRgbaWithLowOpacity = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, 0.05)`;
        };
        return (
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: hexToRgbaWithLowOpacity(themeAccentColor.value) }}
          ></div>
        );
      case BACKGROUND_EFFECTS.OG_BALLS:
        return (
          <OGBallsEffect
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.OG_BOTH:
        return (
          <OGBothEffect
            opacity={qualityParams.opacity}
            speed={qualityParams.speed}
            forceEnable={false}
          />
        );
      case BACKGROUND_EFFECTS.PLAIN_BACKGROUND:
        return <PlainBackground accentColorValue={themeAccentColor.value} />;
      default:
        return (
          <div className="absolute inset-0 bg-red-500/20">
            Unknown effect: {currentEffect}
          </div>
        );
    }
  };

  return (
    <div
      ref={launcherRef}
      className="h-screen w-full overflow-hidden relative flex border border-white/10"
      style={{
        backgroundColor,
        backgroundImage: `
          radial-gradient(ellipse 90% 70% at 18% 35%, ${accent}28 0%, transparent 55%),
          radial-gradient(ellipse 70% 55% at 85% 75%, ${accent}16 0%, transparent 50%),
          linear-gradient(165deg, #121218 0%, #07070a 55%, #050507 100%)
        `,
        boxShadow: `inset 0 0 80px rgba(0,0,0,0.45)`,
      }}
    >
      <BorderGlowEffects accentColor={themeAccentColor.value} />

      <VerticalNavbar
        items={navItems}
        activeItem={activeTab}
        onItemClick={onNavChange}
        className="h-full border-r-2 z-10"
        version={appConfig.version}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <HeaderBar
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />

        <div className="flex-1 relative overflow-hidden">
          <Suspense fallback={null}>{renderBackgroundEffect()}</Suspense>

          <div className="relative z-10 h-full overflow-hidden custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
      {/* Global Modals Portal */}
      <SocialsModal />
      <ProfileWizardV2Modal />
      <ProfileSettingsModal />
      <ProfileDuplicateModal />
    </div>
  );
}

function BorderGlowEffects({ accentColor }: { accentColor: string }) {
  return (
    <>
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute top-0 bottom-0 left-0 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
      <div
        className="absolute top-0 bottom-0 right-0 w-[2px]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${accentColor}70, transparent)`,
        }}
      ></div>
    </>
  );
}

interface HeaderBarProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function HeaderBar({ minimizeRef, maximizeRef, closeRef }: HeaderBarProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const fetchedVersion = await ConfigService.getAppVersion();
        setAppVersion(`v${fetchedVersion}`);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setAppVersion("v5.0.2");
      }
    };
    fetchVersion();
  }, []);

  return (
    <div
      className="h-16 flex-shrink-0 border-b border-white/10 flex items-center justify-between px-6 z-10"
      style={{
        borderColor: `${accentColor.value}33`,
        background:
          "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(0,0,0,0.28))",
        // Wails frameless drag region (replaces GNOME CSD titlebar)
        ["--wails-draggable" as string]: "drag",
      }}
      data-tauri-drag-region
    >
      <div className="flex items-center gap-4" data-tauri-drag-region>
        <NavigationHistory />

        <div className="flex flex-col items-start -mt-1.5">
          <h1
            className="font-minecraft text-3xl tracking-wider text-white font-bold lowercase text-shadow"
            data-tauri-drag-region
          >
            Pixel Play
          </h1>
          <span className="text-white/70 font-minecraft-ten text-[8px] font-normal -mt-2.5">
            {appVersion || "v?.?.?"}
          </span>
        </div>
      </div>

      <div
        className="flex items-center gap-4"
        style={{ ["--wails-draggable" as string]: "no-drag" }}
      >
        <UserProfileBar />

        <WindowControls
          minimizeRef={minimizeRef}
          maximizeRef={maximizeRef}
          closeRef={closeRef}
        />
      </div>
    </div>
  );
}

interface WindowControlsProps {
  minimizeRef: React.RefObject<HTMLDivElement>;
  maximizeRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLDivElement>;
}

function WindowControls({
  minimizeRef,
  maximizeRef,
  closeRef,
}: WindowControlsProps) {
  return (
    <div className="flex items-center gap-3 ml-4">
      <div
        ref={minimizeRef}
        className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
        title="Minimize"
      >
        <Icon icon="pixel:minus-solid" className="w-4 h-4" />
      </div>
      <div
        ref={maximizeRef}
        className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
        title="Maximize"
      >
        <Icon icon="pixel:expand-solid" className="w-4 h-4" />
      </div>
      <div
        ref={closeRef}
        className="titlebar-button-borderless w-5 h-5 flex items-center justify-center text-white/60 hover:text-red-500 transition-colors cursor-pointer"
        title="Close"
      >
        <Icon icon="pixel:window-close-solid" className="w-4 h-4" />
      </div>
    </div>
  );
}
