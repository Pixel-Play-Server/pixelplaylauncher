"use client";

import { useEffect, useState } from "react";
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

import flagsmith from 'flagsmith';
import { FlagsmithProvider } from 'flagsmith/react';

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

  const activeTab = location.pathname.substring(1) || "play";
  const { modals } = useGlobalModalStore();

  const [currentGroupingCriterion, setCurrentGroupingCriterion] =
    useState<string>("none");

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
    const unlisten = listen<FrontendEventPayload>(
      "state_event",
      (event: TauriEvent<FrontendEventPayload>) => {
        if (
          event.payload.event_type === FrontendEventType.MinecraftProcessExited
        ) {
          try {
            const exitPayload: MinecraftProcessExitedPayload = JSON.parse(
              event.payload.message,
            );
            console.log(
              "[App.tsx] Global MinecraftProcessExited event:",
              exitPayload,
            );
            if (!exitPayload.success) {
              const crashMsg = `Minecraft crashed (Exit Code: ${exitPayload.exit_code ?? "N/A"}). See crash report for details.`;
              toast.error(crashMsg, { duration: 10000 });
              openCrashModal(exitPayload);
            }
          } catch (e) {
            console.error(
              "[App.tsx] Failed to parse MinecraftProcessExitedPayload:",
              e,
            );
            toast.error("Could not globally process Minecraft process status.");
          }
        }
      },
    );

    return () => {
      unlisten.then((f) => f());
    };
  }, [openCrashModal]);

  // Listen for deep link events from the Rust backend (pixelplay://...)
  useEffect(() => {
    const unlistenDeep = listen<string>("deep_link", (event) => {
      try {
        const url = event.payload;
        console.log("Deep link recibido:", url);
        toast.success("Deep link recibido: " + url);
        // Basic behavior: navigate to Play tab where users can choose a profile to join
        navigate("/play");
        // TODO: parse URL and auto-fill server launch parameters or prompt user to confirm join
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
    const tabSegment = location.pathname.split("/").filter(Boolean)[0] ?? "play";
    const tabLabels: Record<string, string> = {
      play: "Jugar",
      profiles: "Perfiles",
      profilesv2: "Instancias",
      skins: "Skins",
      settings: "Ajustes",
      logs: "Logs",
    };
    const baseLabel = tabLabels[tabSegment] ?? "Launcher";

    const modalLabel = modals.length > 0 ? `Modal: ${modals[modals.length - 1].id}` : null;
    const launcherState = modalLabel ?? baseLabel;

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
