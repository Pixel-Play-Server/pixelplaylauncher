"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeInitializer } from "./components/ThemeInitializer";
import { ScrollbarProvider } from "./components/ui/ScrollbarProvider";
import { GlobalToaster } from "./components/ui/GlobalToaster";
import { type Event as TauriEvent, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "react-hot-toast";
import {
  type EventPayload as FrontendEventPayload,
  EventType as FrontendEventType,
  type MinecraftProcessExitedPayload,
} from "./types/events";
import { GlobalCrashReportModal } from "./components/modals/GlobalCrashReportModal";
import { TermsOfServiceModal } from "./components/modals/TermsOfServiceModal";
import { GlobalModalPortal } from "./components/ui/GlobalModalPortal";
import { useCrashModalStore } from "./store/crash-modal-store";
import { useThemeStore } from "./store/useThemeStore";
import { useProfileStore } from "./store/profile-store";
import { usePackUpdaterStore } from "./store/pack-updater-store";
import { useGlobalModalStore } from "./hooks/useGlobalModal";
import { refreshNrcDataOnMount } from "./services/nrc-service";
import * as ProcessService from "./services/process-service";
import {
  getLauncherConfig,
  setProfileGroupingPreference,
} from "./services/launcher-config-service";
import { useGlobalDragAndDrop } from './hooks/useGlobalDragAndDrop';
import { loadIcons } from '@iconify/react';
import './lib/i18n'; // Initialize i18n
import { useTranslation } from 'react-i18next';
import { useSocialPoll } from "./hooks/useSocialPoll";
import { usePixelPresence } from "./hooks/usePixelPresence";
import { useRankWatch } from "./hooks/useRankWatch";
const RankUpgradeOverlay = lazy(() =>
  import("./components/account/RankUpgradeOverlay").then((m) => ({ default: m.RankUpgradeOverlay })),
);
import { useRankUpgradeStore } from "./store/rank-upgrade-store";
import { refreshRankCatalog } from "./lib/pixel-rank";

import flagsmith from 'flagsmith';
import { FlagsmithProvider } from 'flagsmith/react';
import { UpdateAvailableModal, type UpdateAvailableInfo } from "./components/updater/UpdateAvailableModal";
import { PackUpdateModal, type PackUpdateInfo } from "./components/updater/PackUpdateModal";
import { VCRedistModal, type VCRedistInfo } from "./components/modals/VCRedistModal";

export type ProfilesTabContext = {
  currentGroupingCriterion: string;
  onGroupingChange: (newCriterion: string) => void;
};

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openCrashModal } = useCrashModalStore();
  const { hasAcceptedTermsOfService } = useThemeStore();
  const { i18n } = useTranslation();
  usePixelPresence();
  useSocialPoll();
  useRankWatch();
  useEffect(() => {
    void refreshRankCatalog(true);
    const t = window.setInterval(() => {
      void refreshRankCatalog(false);
    }, 30 * 60_000);
    let unlisten: (() => void) | undefined;
    void listen("ranks_updated", () => {
      void refreshRankCatalog(true);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      window.clearInterval(t);
      unlisten?.();
    };
  }, []);
  const rankUpgrade = useRankUpgradeStore((s) => s.info);
  const hideRankUpgrade = useRankUpgradeStore((s) => s.hide);

  const activeTab = location.pathname.substring(1) || "play";
  const { modals } = useGlobalModalStore();

  const [currentGroupingCriterion, setCurrentGroupingCriterion] =
    useState<string>("none");
  const [updateInfo, setUpdateInfo] = useState<UpdateAvailableInfo | null>(null);
  const [packUpdate, setPackUpdate] = useState<PackUpdateInfo | null>(null);
  const [vcRedistInfo, setVCRedistInfo] = useState<VCRedistInfo | null>(null);

  const FLAGSMITH_ENVIRONMENT_ID = "eNSibjDaDW2nNJQvJnjj9y"; // User confirmed this is set
  useEffect(() => {
  const root = document.documentElement;
  // Only read the new Pixel Play theme storage key. We intentionally do NOT
  // fallback to the old pixelplay key so previously saved blue themes don't
  // override the new Pixel Play defaults on first load.
  const storedTheme = localStorage.getItem("pixelplay-theme-storage");
    if (storedTheme) {
      try {
        const themeData = JSON.parse(storedTheme);
        if (themeData.state?.accentColor?.value) {
          root.style.setProperty("--accent", themeData.state.accentColor.value);
          root.style.setProperty(
            "--accent-hover",
            themeData.state.accentColor.hoverValue,
          );

          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
              hex,
            );
            return result
              ? `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`
              : null;
          };

          const rgbValue = hexToRgb(themeData.state.accentColor.value);
          if (rgbValue) {
            root.style.setProperty("--accent-rgb", rgbValue);
          }
        }
        
        if (themeData.state?.radiusTheme) {
          const radiusTheme = themeData.state.radiusTheme;
          root.setAttribute("data-radius-theme", radiusTheme);
          
          if (radiusTheme === "flat") {
            root.classList.add("radius-flat");
            root.style.setProperty("--radius", "0px");
          } else {
            root.classList.remove("radius-flat");
            const radiusMap: Record<string, string> = {
              sm: "var(--radius-sm)",
              md: "var(--radius-md)",
              lg: "var(--radius-lg)",
              xl: "var(--radius-xl)",
              "2xl": "var(--radius-2xl)",
            };
            root.style.setProperty("--radius", radiusMap[radiusTheme] || "var(--radius-md)");
          }
        }
      } catch (e) {
        console.error("Failed to parse stored theme:", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleExit = (raw: unknown) => {
      const exitPayload = parseMinecraftExitPayload(raw);
      if (!exitPayload) {
        toast.error("Minecraft se cerró y no se pudo leer el código de salida.");
        return;
      }
      if (exitPayload.stopped) {
        return;
      }
      if (!exitPayload.success) {
        const code = exitPayload.exit_code;
        const isDllMissing =
          code === 3221225781 ||
          code === -1073741515 ||
          (typeof code === "number" && (code >>> 0) === 0xc0000135);
        const hint = exitPayload.exit_hint || "";
        toast.error(
          hint
            ? `Minecraft se cerró (código ${code ?? "N/A"}). ${isDllMissing ? "Revisá el mensaje de Visual C++ / natives." : hint.slice(0, 120)}`
            : `Minecraft se cerró con error (código ${code ?? "N/A"}).`,
          { duration: 12000 },
        );
        // VC++ popup solo vía evento vcredist_required (evita bucle si ya está instalado).
        if (!isDllMissing) {
          openCrashModal(exitPayload);
        } else if (hint) {
          toast(hint, { duration: 16000, icon: "⚠️" });
        }
      }
    };

    const unlistenState = listen<FrontendEventPayload>(
      "state_event",
      (event: TauriEvent<FrontendEventPayload>) => {
        if (event.payload.event_type === FrontendEventType.MinecraftProcessExited) {
          handleExit(event.payload.message);
        }
      },
    );
    const unlistenDirect = listen<MinecraftProcessExitedPayload>(
      FrontendEventType.MinecraftProcessExited,
      (event) => handleExit(event.payload),
    );

    return () => {
      unlistenState.then((fn) => fn());
      unlistenDirect.then((fn) => fn());
    };
  }, [openCrashModal]);

  // Visual C++ redistributable required (DLL missing / exit 3221225781)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let unlistenState: (() => void) | undefined;
    void listen<VCRedistInfo>("vcredist_required", (event) => {
      setVCRedistInfo({
        title: event.payload?.title || "Instalá Visual C++",
        message: event.payload?.message,
        url: event.payload?.url,
        path: event.payload?.path,
      });
    }).then((fn) => {
      unlisten = fn;
    });
    void listen<FrontendEventPayload>("state_event", (event) => {
      if (event.payload.event_type === "vcredist_required") {
        setVCRedistInfo({
          title: "Instalá Visual C++",
          message: event.payload.message,
          url: "https://aka.ms/vs/17/release/vc_redist.x64.exe",
        });
      }
    }).then((fn) => {
      unlistenState = fn;
    });
    return () => {
      unlisten?.();
      unlistenState?.();
    };
  }, []);

  // Go/Wails updater + author-protection notifications
  useEffect(() => {
    let alive = true;
    const unsubs: Array<() => void> = [];

    (async () => {
      unsubs.push(
        await listen<{ status?: string; message?: string; to_version?: string }>(
          "updater_status",
          (event) => {
            if (!alive) return;
            const p = event.payload;
            if (p?.status === "available") {
              toast.success(p.message || "Actualización disponible", {
                duration: 10000,
                id: "updater-available",
              });
              setUpdateInfo({
                message: p.message,
                to: (p as { to_version?: string }).to_version,
              });
            }
          },
        ),
      );
      unsubs.push(
        await listen<{ message?: string; to?: string; from?: string }>(
          "updater_available",
          (event) => {
            if (!alive) return;
            const p = event.payload;
            toast.success(
              p?.message ||
                `Nueva versión ${p?.to ?? ""} disponible (tienes ${p?.from ?? ""})`,
              { duration: 12000, id: "updater-available" },
            );
            setUpdateInfo({
              from: p?.from,
              to: p?.to,
              url: (p as UpdateAvailableInfo)?.url,
              notes: (p as UpdateAvailableInfo)?.notes,
              message: p?.message,
              source: (p as UpdateAvailableInfo)?.source,
            });
          },
        ),
      );
      unsubs.push(
        await listen<{ message?: string; action?: string }>(
          "author_protection",
          (event) => {
            if (!alive) return;
            toast.error(
              event.payload?.message ||
                "Protección de autor: acción bloqueada",
              { duration: 6000, id: "author-protection" },
            );
          },
        ),
      );
      unsubs.push(
        await listen<{
          pack_id?: string;
          displayName?: string;
          from?: string;
          to?: string;
        }>("modpack_update_available", (event) => {
          if (!alive) return;
          const p = event.payload;
          usePackUpdaterStore.getState().markAvailable(p?.pack_id || "", p?.from, p?.to);
          setPackUpdate({
            pack_id: p?.pack_id,
            displayName: p?.displayName,
            from: p?.from,
            to: p?.to,
            notes: (p as { notes?: string }).notes,
            status: "downloading",
          });
          toast.loading(
            `Actualizando ${p?.displayName || p?.pack_id || "pack"} ${p?.from ?? ""} → ${p?.to ?? ""}…`,
            { id: `pack-up-${p?.pack_id || "x"}`, duration: 20000 },
          );
        }),
      );
      unsubs.push(
        await listen<{
          pack_id?: string;
          displayName?: string;
          from?: string;
          to?: string;
          message?: string;
          status?: string;
        }>("modpack_updated", (event) => {
          if (!alive) return;
          const p = event.payload;
          usePackUpdaterStore.getState().markUpdated(p?.pack_id || "", p?.to);
          setPackUpdate((prev) => ({
            ...(prev || {}),
            pack_id: p?.pack_id || prev?.pack_id,
            displayName: p?.displayName || prev?.displayName,
            from: p?.from || prev?.from,
            to: p?.to || prev?.to,
            status: "done",
          }));
          toast.success(
            `${p?.displayName || "Pixel"} actualizado a ${p?.to || "nueva versión"}`,
            { id: `pack-up-${p?.pack_id || "x"}`, duration: 8000 },
          );
        }),
      );
      unsubs.push(
        await listen<{ pack_id?: string; status?: string; message?: string }>(
          "modpack_update_status",
          (event) => {
            if (!alive) return;
            const p = event.payload;
            if (p?.status === "error") {
              setPackUpdate((prev) => ({
                ...(prev || {}),
                pack_id: p.pack_id || prev?.pack_id,
                status: "error",
                message: p.message,
              }));
              toast.error(p.message || "No se pudo actualizar el pack", {
                id: `pack-up-${p?.pack_id || "x"}`,
              });
            }
          },
        ),
      );
    })();

    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, []);

  // Listen for deep link events from the Rust backend (pixelplay://...)
  useEffect(() => {
    const unlistenDeep = listen<string>("deep_link", (event) => {
      try {
        const raw = event.payload;
        console.log("Deep link recibido:", raw);
        const url = raw.includes("://") ? new URL(raw) : new URL(raw, "pixelplay://join");
        const server =
          url.searchParams.get("server") ??
          url.searchParams.get("ip") ??
          (url.hostname && url.hostname !== "join" ? url.hostname : null) ??
          "mc.pixelplay.gg";

        navigate("/play");
        toast.success(`Conectando a ${server}...`);

        window.dispatchEvent(
          new CustomEvent("pixelplay-deep-link", {
            detail: { server, profile: url.searchParams.get("profile") },
          }),
        );
      } catch (e) {
        console.error("Error al manejar deep_link:", e);
        toast.error("No se pudo manejar el enlace profundo.");
      }
    });

    return () => {
      unlistenDeep.then((f) => f());
    };
  }, [navigate]);

  // Handle deep links that already resolve profile+server in backend.
  useEffect(() => {
    const unlistenDeepOpen = listen<{ profile?: string | null; server?: string }>(
      "deep_link_open",
      async (event) => {
        try {
          const server = event.payload?.server;
          if (!server) {
            return;
          }

          const profileStore = useProfileStore.getState();
          let targetProfileId = event.payload?.profile ?? profileStore.lastPlayedProfileId;

          if (!targetProfileId) {
            await profileStore.fetchProfiles();
            const refreshedState = useProfileStore.getState();
            targetProfileId =
              refreshedState.lastPlayedProfileId ??
              refreshedState.selectedProfile?.id ??
              refreshedState.profiles[0]?.id ??
              null;
          }

          if (!targetProfileId) {
            toast.error("No se encontró un perfil para QuickPlay.");
            navigate("/profiles");
            return;
          }

          const targetProfile =
            useProfileStore.getState().profiles.find((p) => p.id === targetProfileId) ?? null;
          if (targetProfile) {
            useProfileStore.getState().setSelectedProfile(targetProfile);
          }

          navigate("/play");
          await ProcessService.launch(targetProfileId, undefined, server);
          toast.success(`🌐 Conectando a ${server}`);
        } catch (e) {
          console.error("Error al manejar deep_link_open:", e);
          toast.error("No se pudo iniciar QuickPlay.");
        }
      },
    );

    return () => {
      unlistenDeepOpen.then((f) => f());
    };
  }, [navigate]);

  useEffect(() => {
    refreshNrcDataOnMount();
  }, []);

  // Icons beim App-Start vorladen
  useEffect(() => {
    const preloadIcons = async () => {
      await loadIcons([
        // Action Buttons
        'solar:play-bold',
        'solar:box-bold', 
        'solar:settings-bold',
        
        // Group Tabs & Navigation
        'solar:add-circle-bold',
        'solar:user-id-bold',
        'solar:widget-bold',
        'solar:emoji-funny-circle-bold',
        'solar:users-group-rounded-bold',
        'solar:ranking-bold',
        'solar:shop-bold',
        
        // Search & Filters
        'solar:magnifer-bold',
        'solar:text-bold',
        'solar:clock-circle-bold',
        'solar:calendar-add-bold',
        'solar:layers-bold',
        'solar:gamepad-bold',
        'solar:lightbulb-bold',
        
        // Status & UI
        'solar:danger-triangle-bold',
        'solar:check-circle-bold',
        'solar:info-circle-bold',
        'solar:danger-circle-bold',
        'solar:close-circle-bold',
        
        // Common UI Elements
        'solar:alt-arrow-down-bold',
        'solar:alt-arrow-up-bold',
        'solar:refresh-bold',
        'solar:stop-bold',
        'solar:folder-bold',
        'solar:download-bold',
        'solar:upload-bold',
        'solar:code-bold',
        'solar:palette-bold',
      ]);
    };

    preloadIcons().catch(console.error);
  }, []);

  useEffect(() => {
    getLauncherConfig()
      .then((config) => {
        if (config && config.profile_grouping_criterion) {
          setCurrentGroupingCriterion(config.profile_grouping_criterion);
        } else {
          setCurrentGroupingCriterion("none");
        }
        
        // Set language from config
        if (config && config.language) {
          i18n.changeLanguage(config.language);
        }
      })
      .catch((err) => {
        console.error(
          "Failed to get initial profile grouping from config:",
          err,
        );
        setCurrentGroupingCriterion("none");
      });
  }, [i18n]);

  useEffect(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const tabSegment = segments[0] ?? "play";
    const tabLabels: Record<string, string> = {
      play: "Jugar",
      profiles: "Perfiles",
      profilesv2: "Perfiles",
      mods: "Mods",
      skins: "Skins",
      friends: "Amigos",
      survival: "Survival",
      capes: "Capes",
      settings: "Ajustes",
      logs: "Logs",
    };
    const baseLabel = tabLabels[tabSegment] ?? "Launcher";

    // Enrich with profile name when browsing an instance
    let profileHint: string | null = null;
    if (
      (tabSegment === "profiles" || tabSegment === "profilesv2") &&
      segments[1]
    ) {
      const profile = useProfileStore
        .getState()
        .profiles.find((p) => p.id === segments[1]);
      if (profile?.name) {
        profileHint = profile.name;
      }
    }

    const modalLabel =
      modals.length > 0 ? `Modal: ${modals[modals.length - 1].id}` : null;
    const launcherState = [
      modalLabel ?? baseLabel,
      profileHint,
    ]
      .filter(Boolean)
      .join(" · ");

    invoke("set_discord_state", {
      stateType: "launcher",
      profileName: launcherState,
    }).catch((e) => {
      console.warn("No se pudo actualizar Discord Presence del launcher:", e);
    });
  }, [location.pathname, modals]);

  const handleProfileGroupingChange = async (newCriterion: string) => {
    setCurrentGroupingCriterion(newCriterion);
    try {
      await setProfileGroupingPreference(newCriterion);
      console.log("[App.tsx] Grouping preference saved successfully.");
    } catch (error) {
      console.error("[App.tsx] Failed to save grouping preference:", error);
      toast.error("Failed to save grouping preference.");
    }
  };

  const handleNavChange = (tabId: string) => {
    navigate(`/${tabId}`);
  };

  const profilesTabContext: ProfilesTabContext = {
    currentGroupingCriterion,
    onGroupingChange: handleProfileGroupingChange,
  };

  useGlobalDragAndDrop();

  return (
    <FlagsmithProvider
      options={{
        environmentID: FLAGSMITH_ENVIRONMENT_ID,
        api: 'https://flagsmith-staging.pixelplay.gg/api/v1/',
      }}
      flagsmith={flagsmith}
    >
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <ThemeInitializer />
        <ScrollbarProvider />
        <GlobalToaster />
        <GlobalCrashReportModal />
        <TermsOfServiceModal isOpen={!hasAcceptedTermsOfService} />
        <GlobalModalPortal />
        {updateInfo && (
          <UpdateAvailableModal
            info={updateInfo}
            onClose={() => setUpdateInfo(null)}
          />
        )}
        {packUpdate && (
          <PackUpdateModal
            info={packUpdate}
            onClose={() => setPackUpdate(null)}
          />
        )}
        {vcRedistInfo && (
          <VCRedistModal
            info={vcRedistInfo}
            onClose={() => setVCRedistInfo(null)}
          />
        )}
        {rankUpgrade && (
          <Suspense fallback={null}>
            <RankUpgradeOverlay info={rankUpgrade} onClose={hideRankUpgrade} />
          </Suspense>
        )}
        <AppLayout activeTab={activeTab} onNavChange={handleNavChange}>
          <Outlet context={profilesTabContext} />
        </AppLayout>
      </div>
    </FlagsmithProvider>
  );
}

export function useProfilesTabContext() {
  return useOutletContext<ProfilesTabContext>();
}

function parseMinecraftExitPayload(raw: unknown): MinecraftProcessExitedPayload | null {
  if (raw && typeof raw === "object" && "profile_id" in raw) {
    return raw as MinecraftProcessExitedPayload;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as MinecraftProcessExitedPayload;
    } catch {
      const match = raw.match(/(-?\d+)/);
      if (!match) return null;
      const code = Number(match[1]);
      return {
        profile_id: "",
        process_id: "",
        exit_code: code,
        success: code === 0,
        process_metadata: null,
      };
    }
  }
  return null;
}
