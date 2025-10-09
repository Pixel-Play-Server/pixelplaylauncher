"use client";

import { Icon } from "@iconify/react";
import { Button } from "../../../ui/buttons/Button";
import { IconButton } from "../../../ui/buttons/IconButton";
// import { GenericListItem } from "../../../ui/GenericListItem"; // Likely remove or adapt
import { TagBadge } from "../../../ui/TagBadge";
import { useThemeStore } from "../../../../store/useThemeStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenericContentTab } from "../../../ui/GenericContentTab";
import { preloadIcons } from "../../../../lib/icon-utils";
import type { Profile } from "../../../../types/profile"; // Import real types
import type {
  pixelplayModEntryDefinition,
  pixelplayModpacksConfig,
  pixelplayModSourceDefinition,
} from "../../../../types/pixelplayPacks"; // Changed pixelplayPackMod to pixelplayModEntryDefinition
import * as ProfileService from "../../../../services/profile-service"; // Import ProfileService
// import { ModrinthService } from "../../../../services/modrinth-service"; // No Modrinth specific service needed for pixelplay
import { SearchInput } from "../../../ui/SearchInput";
import { Checkbox } from "../../../ui/Checkbox";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event"; // For state updates
import { GenericDetailListItem } from "../items/GenericDetailListItem";
import { toast } from "react-hot-toast";
// import { toggleContentFromProfile } from "../../../../services/content-service"; // pixelplay has its own toggle
// import type { ToggleContentPayload } from "../../../../types/content"; // Not directly needed
import { Select, type SelectOption } from "../../../ui/Select"; // Import Select and SelectOption

// Icons specific to pixelplayModsTabV2 (can be adjusted)
const pixelplay_MODS_TAB_ICONS_TO_PRELOAD = [
  "solar:shield-bold-duotone", // Fallback icon, empty state, pixelplay theme
  "solar:settings-bold-duotone",
  "solar:info-circle-bold-duotone",
  "solar:check-circle-bold", // Enabled status
  "solar:close-circle-bold", // Disabled status
  "solar:box-bold-duotone", // Generic mod icon (if no specific pixelplay icon)
  "solar:folder-open-bold-duotone",
  "solar:trash-bin-trash-bold", // Might not be used if pixelplay mods are not deletable
  "solar:menu-dots-bold",
  "solar:sort-from_top_to_bottom-bold-duotone",
  "solar:refresh-square-bold-duotone",
  // "solar:cloud-download-bold-duotone", // pixelplay mods are not individually downloaded/updated this way
  "solar:refresh-bold", // For Refreshing pixelplay Pack list
  "solar:add-circle-bold-duotone", // Might not be used if mods are only from pack
  "solar:refresh-outline",
  // "solar:double-alt-arrow-up-bold-duotone" // No "Update All" for pixelplay mods
  "solar:danger-triangle-bold", // For errors
];

// Adapted from pixelplayModsTab.tsx
interface pixelplayModV2 {
  id: string; // Typically the mod's unique identifier within the pack
  display_name: string;
  description?: string;
  version?: string;
  enabled: boolean;
  source_type?: pixelplayModSourceDefinition["type"]; // Added to store source type for badges
  // path?: string; // Path might not be relevant if icons are fetched by ID/name
  // We will store fetched local icons in a separate state similar to ModsTabV2/ResourcePacksTabV2
}

interface pixelplayModsTabV2Props {
  profile: Profile; // Profile is required
  onRefreshRequired?: () => void;
}

// Helper (can be adapted or removed if not needed)
// const getModFileNameFromSource = (mod: pixelplayModV2 | null | undefined): string | null => { ... }

export function pixelplayModsTabV2({
  profile,
  onRefreshRequired,
}: pixelplayModsTabV2Props) {
  if (!profile) {
    // This should ideally not happen if Profile is marked as required
    // but as a safeguard:
    return (
      <div className="p-4 font-minecraft text-center text-white/70">
        Profile data is not available. Cannot display pixelplay mods.
      </div>
    );
  }

  const accentColor = useThemeStore((state) => state.accentColor);

  const [pixelplayMods, setpixelplayMods] = useState<pixelplayModV2[]>([]);
  const [pixelplayPacksConfig, setpixelplayPacksConfig] =
    useState<pixelplayModpacksConfig | null>(null);
  const [localIcons, setLocalIcons] = useState<Record<string, string | null>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingPacks, setIsRefreshingPacks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modBeingToggled, setModBeingToggled] = useState<string | null>(null);
  const [selectedModIds, setSelectedModIds] = useState<Set<string>>(new Set());
  const [isBatchToggling, setIsBatchToggling] = useState(false);
  const [unlistenFn, setUnlistenFn] = useState<(() => void) | undefined>();

  // Ref to track the last pack ID for which mods were loaded/attempted to load
  const lastLoadedPackIdRef = useRef<string | null | undefined>(
    profile.selected_pixelplay_pack_id,
  );

  // Moved data fetching and processing logic before useEffects that depend on them
  const ispixelplayModDisabled = useCallback(
    (packModId: string): boolean => {
      if (
        !profile.selected_pixelplay_pack_id ||
        !profile.disabled_pixelplay_mods_detailed
      ) {
        return false;
      }
      return profile.disabled_pixelplay_mods_detailed.some(
        (identifier) =>
          identifier.pack_id === profile.selected_pixelplay_pack_id &&
          identifier.mod_id === packModId &&
          identifier.game_version === profile.game_version &&
          identifier.loader === profile.loader,
      );
    },
    [
      profile.selected_pixelplay_pack_id,
      profile.disabled_pixelplay_mods_detailed,
      profile.game_version,
      profile.loader,
    ],
  );

  const fetchModIconsForpixelplay = useCallback(
    async (compatibleRawMods: pixelplayModEntryDefinition[]) => {
      if (compatibleRawMods.length === 0) {
        setLocalIcons({});
        return;
      }
      try {
        const iconsResult = await invoke<Record<string, string | null>>(
          "get_icons_for_pixelplay_mods",
          {
            mods: compatibleRawMods,
            minecraftVersion: profile.game_version,
            loader: profile.loader,
          },
        );
        if (iconsResult) {
          setLocalIcons(iconsResult);
        } else {
          setLocalIcons({});
        }
      } catch (err) {
        console.error("Failed to fetch pixelplay mod icons:", err);
        setLocalIcons({});
      }
    },
    [profile.game_version, profile.loader],
  );

  const processFetchedMods = useCallback(
    async (
      rawMods: pixelplayModEntryDefinition[],
      currentPacksConfig: pixelplayModpacksConfig,
    ) => {
      let compatibleRawMods = rawMods;
      if (rawMods.length > 0 && rawMods[0].compatibility) {
        compatibleRawMods = rawMods.filter((mod) => {
          if (!mod.compatibility) return true;
          const gameVersionCompat = mod.compatibility[profile.game_version];
          if (!gameVersionCompat) return false;
          return !!gameVersionCompat[profile.loader];
        });
      }

      const processedMods: pixelplayModV2[] = compatibleRawMods.map((rawMod) => {
        let version: string | undefined = undefined;
        if (
          rawMod.compatibility &&
          rawMod.compatibility[profile.game_version] &&
          rawMod.compatibility[profile.game_version][profile.loader]
        ) {
          const target =
            rawMod.compatibility[profile.game_version][profile.loader];
          if (target) {
            version = target.identifier;
          }
        }
        const enabled = !ispixelplayModDisabled(rawMod.id);
        return {
          id: rawMod.id,
          display_name: rawMod.displayName || rawMod.id,
          version: version,
          enabled: enabled,
          source_type: rawMod.source?.type,
        };
      });

      setpixelplayMods(processedMods);

      if (compatibleRawMods.length > 0) {
        await fetchModIconsForpixelplay(compatibleRawMods);
      } else {
        setLocalIcons({});
      }
    },
    [
      ispixelplayModDisabled,
      profile.game_version,
      profile.loader,
      fetchModIconsForpixelplay,
    ],
  );

  const fetchpixelplayPacksAndMods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let currentPacksConfig = pixelplayPacksConfig;
      if (!currentPacksConfig) {
        try {
          currentPacksConfig = await ProfileService.getpixelplayPacksResolved();
        } catch (resolvedError) {
          console.warn(
            "Failed to get resolved pixelplay packs, trying basic:",
            resolvedError,
          );
          currentPacksConfig = await ProfileService.getpixelplayPacks();
        }
        setpixelplayPacksConfig(currentPacksConfig);
      }

      if (profile.selected_pixelplay_pack_id && currentPacksConfig) {
        let rawModsData: pixelplayModEntryDefinition[] = [];
        try {
          const modsResult = await invoke<pixelplayModEntryDefinition[]>(
            "get_pixelplay_pack_mods",
            {
              packId: profile.selected_pixelplay_pack_id,
              gameVersion: profile.game_version,
              loader: profile.loader,
            },
          );
          if (Array.isArray(modsResult)) {
            rawModsData = modsResult;
          } else {
            console.warn(
              "Unexpected response from get_pixelplay_pack_mods, not an array:",
              modsResult,
            );
            const packDef =
              currentPacksConfig.packs[profile.selected_pixelplay_pack_id];
            if (packDef?.mods) {
              rawModsData = packDef.mods;
            }
          }
        } catch (directError) {
          console.warn(
            "get_pixelplay_pack_mods failed, trying fallback to pack definition:",
            directError,
          );
          const packDef =
            currentPacksConfig.packs[profile.selected_pixelplay_pack_id];
          if (packDef?.mods) {
            rawModsData = packDef.mods;
          } else {
            console.warn(
              "Pack definition has no mods, trying list_pixelplay_mods for profile:",
              profile.id,
            );
            try {
              const lastResortResult = await invoke<pixelplayModEntryDefinition[]>(
                "list_pixelplay_mods",
                {
                  profileId: profile.id,
                },
              );
              if (Array.isArray(lastResortResult)) {
                rawModsData = lastResortResult;
              } else {
                console.error(
                  "list_pixelplay_mods also returned unexpected data:",
                  lastResortResult,
                );
              }
            } catch (lastResortError) {
              console.error("list_pixelplay_mods also failed:", lastResortError);
              throw new Error(
                `Failed to load pixelplay mods. Pack: ${profile.selected_pixelplay_pack_id}. Error: ${lastResortError}`,
              );
            }
          }
        }

        if (rawModsData.length > 0) {
          await processFetchedMods(rawModsData, currentPacksConfig);
        } else {
          setpixelplayMods([]);
          setLocalIcons({});
          console.log(
            "No pixelplay mods found for pack:",
            profile.selected_pixelplay_pack_id,
          );
        }
      } else {
        setpixelplayMods([]);
        setLocalIcons({});
      }
    } catch (err) {
      console.error("Failed to load pixelplay packs or mods:", err);
      setError(
        `Failed to load pixelplay data: ${err instanceof Error ? err.message : String(err)}`,
      );
      setpixelplayMods([]);
      setLocalIcons({});
    } finally {
      setIsLoading(false);
    }
  }, [
    profile.id,
    profile.selected_pixelplay_pack_id,
    profile.game_version,
    profile.loader,
    pixelplayPacksConfig,
    processFetchedMods,
  ]);

  useEffect(() => {
    preloadIcons(pixelplay_MODS_TAB_ICONS_TO_PRELOAD);
  }, []);

  // Effect to listen for global state events that might require a refresh
  useEffect(() => {
    const setupEventListeners = async () => {
      const unlisten = await listen<any>("state_event", (event) => {
        const payload = event.payload;
        if (
          payload.event_type === "trigger_profile_update" &&
          payload.target_id === profile.id
        ) {
          fetchpixelplayPacksAndMods();
        }
      });
      setUnlistenFn(() => unlisten);
      return unlisten;
    };

    setupEventListeners();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [profile.id, unlistenFn, fetchpixelplayPacksAndMods]);

  // Initial data load and load when profile or selected pack changes
  useEffect(() => {
    if (lastLoadedPackIdRef.current !== profile.selected_pixelplay_pack_id) {
      setpixelplayMods([]);
      setLocalIcons({});
    }
    fetchpixelplayPacksAndMods();
    lastLoadedPackIdRef.current = profile.selected_pixelplay_pack_id;
  }, [profile.id, profile.selected_pixelplay_pack_id, fetchpixelplayPacksAndMods]);

  const handleRefreshPacks = async () => {
    setIsRefreshingPacks(true);
    setError(null);
    try {
      await ProfileService.refreshpixelplayPacks(); // This should internally trigger updates or we refetch
      // After refreshing, refetch everything
      // By setting pixelplayPacksConfig to null, we ensure it's re-fetched by fetchpixelplayPacksAndMods
      setpixelplayPacksConfig(null);
      // fetchpixelplayPacksAndMods will be called by the useEffect due to pixelplayPacksConfig change
      // or we can call it directly if preferred, but resetting config should be enough
      // For explicit control:
      await fetchpixelplayPacksAndMods();
    } catch (err) {
      console.error("Failed to refresh pixelplay packs list:", err);
      setError(
        `Failed to refresh pixelplay packs: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsRefreshingPacks(false);
    }
  };

  const handleTogglepixelplayMod = useCallback(
    async (modId: string) => {
      if (!profile.selected_pixelplay_pack_id) {
        toast.error("No pixelplay pack selected.");
        return;
      }
      const mod = pixelplayMods.find((m) => m.id === modId);
      if (!mod) {
        toast.error("Mod not found locally. Try refreshing.");
        return;
      }

      setModBeingToggled(modId);
      const newEnabledState = !mod.enabled;

      setpixelplayMods((prevMods) =>
        prevMods.map((m) =>
          m.id === modId ? { ...m, enabled: newEnabledState } : m,
        ),
      );

      try {
        await invoke("set_pixelplay_mod_status", {
          profileId: profile.id,
          packId: profile.selected_pixelplay_pack_id,
          modId: modId,
          gameVersion: profile.game_version,
          loaderStr: profile.loader,
          disabled: !newEnabledState,
        });

        // SUCCESS: Backend updated. Optimistic UI update is already done.
        // No onRefreshRequired() needed here if optimistic update is sufficient for UI.
        // The actual profile.disabled_pixelplay_mods_detailed will be updated on next full refresh/load.
      } catch (err) {
        console.error(`Failed to toggle pixelplay mod ${mod.display_name}:`, err);
        toast.error(
          `Failed to toggle ${mod.display_name}: ${err instanceof Error ? err.message : String(err.message)}`,
        );
        setpixelplayMods((prevMods) =>
          prevMods.map((m) =>
            m.id === modId ? { ...m, enabled: mod.enabled } : m,
          ),
        );
      } finally {
        setModBeingToggled(null);
      }
    },
    [pixelplayMods, profile, onRefreshRequired],
  ); // Keep onRefreshRequired in deps if other parts of the callback chain might still need it, though we are not calling it.
  // Or remove if truly not needed by any path from this callback.
  // For now, let's assume it might be used by error paths or future extensions, so keep it.

  const filteredMods = useMemo(() => {
    let modsToFilter = pixelplayMods;
    if (searchQuery) {
      modsToFilter = pixelplayMods.filter(
        (mod) =>
          (mod.display_name || mod.id)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (mod.description || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }
    return [...modsToFilter].sort((a, b) => {
      const nameA = a.display_name || a.id;
      const nameB = b.display_name || b.id;
      return nameA.localeCompare(nameB);
    });
  }, [pixelplayMods, searchQuery]);

  // Define handleModSelectionChange first as renderpixelplayModItem depends on it.
  const handleModSelectionChange = useCallback(
    (modId: string, isSelected: boolean) => {
      setSelectedModIds((prevSelectedIds) => {
        const newSelectedIds = new Set(prevSelectedIds);
        if (isSelected) {
          newSelectedIds.add(modId);
        } else {
          newSelectedIds.delete(modId);
        }
        return newSelectedIds;
      });
    },
    [],
  );

  const areAllFilteredSelected = useMemo(() => {
    if (filteredMods.length === 0) return false;
    return filteredMods.every((mod) => selectedModIds.has(mod.id));
  }, [filteredMods, selectedModIds]);

  const handleSelectAllToggle = useCallback(
    (isChecked: boolean) => {
      if (isChecked) {
        setSelectedModIds(new Set(filteredMods.map((mod) => mod.id)));
      } else {
        setSelectedModIds(new Set());
      }
    },
    [filteredMods],
  );

  const handleBatchToggleSelected = async () => {
    if (!profile.selected_pixelplay_pack_id || selectedModIds.size === 0) {
      if (selectedModIds.size > 0) toast.error("No pixelplay pack selected.");
      return;
    }

    setIsBatchToggling(true);
    const errors: string[] = [];
    let successfulToggles = 0;

    const modsToToggle = Array.from(selectedModIds)
      .map((id) => pixelplayMods.find((m) => m.id === id))
      .filter(Boolean) as pixelplayModV2[];

    for (const mod of modsToToggle) {
      const currentModState = pixelplayMods.find((m) => m.id === mod.id);
      if (!currentModState) {
        errors.push(`Mod ${mod.id} not found during batch operation.`);
        continue;
      }
      const newEnabledState = !currentModState.enabled;

      try {
        await invoke("set_pixelplay_mod_status", {
          profileId: profile.id,
          packId: profile.selected_pixelplay_pack_id,
          modId: mod.id,
          gameVersion: profile.game_version,
          loaderStr: profile.loader,
          disabled: !newEnabledState,
        });
        successfulToggles++;
        setpixelplayMods((prev) =>
          prev.map((m) =>
            m.id === mod.id ? { ...m, enabled: newEnabledState } : m,
          ),
        );
      } catch (err) {
        const errorDetail = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to toggle ${mod.display_name}: ${errorDetail}`);
        toast.error(`Failed to toggle ${mod.display_name}: ${errorDetail}`);
        // No individual revert here; the full list isn't reverted on partial batch failure.
        // The items that failed will remain in their original state in the UI due to lack of optimistic update for them.
      }
    }

    setIsBatchToggling(false);
    setSelectedModIds(new Set());

    if (errors.length > 0) {
      console.warn(
        "Batch pixelplay mod toggle finished with errors:",
        errors.join("; "),
      );
    }
  };

  const handleSelectedPackChange = async (newPackId: string | null) => {
    // Allow null for unsetting
    if (newPackId === profile.selected_pixelplay_pack_id) return; // No change
    try {
      await ProfileService.updateProfile(profile.id, {
        selected_pixelplay_pack_id: newPackId,
        clear_selected_pixelplay_pack: newPackId === null,
      });
      if (onRefreshRequired) {
        onRefreshRequired();
      }
    } catch (err) {
      console.error("Failed to update selected pixelplay pack:", err);
      toast.error(
        `Failed to switch pixelplay pack: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const pixelplayPackOptions = useMemo((): SelectOption[] => {
    if (!pixelplayPacksConfig)
      return [{ value: "", label: "- No Pack Selected -" }]; // Return default if no config

    const options = Object.entries(pixelplayPacksConfig.packs).map(
      ([id, packDef]) => ({
        value: id,
        label: packDef.displayName || id,
      }),
    );

    // Sort packs by name
    options.sort((a, b) => a.label.localeCompare(b.label));

    // Prepend the "No Pack Selected" option
    return [{ value: "", label: "- No Pack Selected -" }, ...options];
  }, [pixelplayPacksConfig]);

  const renderpixelplayModItem = useCallback(
    (mod: pixelplayModV2) => {
      const itemTitle = mod.display_name || mod.id;
      const isToggling = modBeingToggled === mod.id;

      let iconToShow: React.ReactNode;
      const localIconData = localIcons[mod.id];
      if (localIconData) {
        iconToShow = (
          <img
            src={`data:image/png;base64,${localIconData}`}
            alt={`${itemTitle} icon`}
            className="w-full h-full object-contain image-pixelated"
          />
        );
      } else {
        iconToShow = (
          <Icon
            icon={pixelplay_MODS_TAB_ICONS_TO_PRELOAD[0]}
            className="w-8 h-8 sm:w-10 sm:h-10 text-white/40"
          />
        );
      }
      const itemIconNode = (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {iconToShow}
        </div>
      );
      const itemDescriptionNode = (
        <span title={`Version: ${mod.version || "N/A"}`}>
          Version: {mod.version || "N/A"}
        </span>
      );
      const sourceTypeDisplay: Record<
        Extract<
          pixelplayModSourceDefinition["type"],
          "modrinth" | "maven" | "url"
        >,
        { label: string; variant: "info" | "default" | "warning" }
      > = {
        modrinth: { label: "Modrinth", variant: "info" },
        maven: { label: "Maven", variant: "default" },
        url: { label: "URL", variant: "warning" },
      };
      const itemBadgesNode = (
        <>
          <TagBadge
            size="sm"
            variant={mod.enabled ? "success" : "destructive"}
            iconElement={
              mod.enabled ? (
                <Icon icon={pixelplay_MODS_TAB_ICONS_TO_PRELOAD[3]} />
              ) : (
                <Icon icon={pixelplay_MODS_TAB_ICONS_TO_PRELOAD[4]} />
              )
            }
          >
            {mod.enabled ? "Enabled" : "Disabled"}
          </TagBadge>
          {mod.source_type &&
            sourceTypeDisplay[
              mod.source_type as Extract<
                pixelplayModSourceDefinition["type"],
                "modrinth" | "maven" | "url"
              >
            ] && (
              <TagBadge
                size="sm"
                variant={
                  sourceTypeDisplay[
                    mod.source_type as Extract<
                      pixelplayModSourceDefinition["type"],
                      "modrinth" | "maven" | "url"
                    >
                  ].variant
                }
                className="ml-1 capitalize"
              >
                {
                  sourceTypeDisplay[
                    mod.source_type as Extract<
                      pixelplayModSourceDefinition["type"],
                      "modrinth" | "maven" | "url"
                    >
                  ].label
                }
              </TagBadge>
            )}
        </>
      );
      const itemMainActionNode = (
        <Button
          size="sm"
          variant={mod.enabled ? "secondary" : "default"}
          onClick={() => handleTogglepixelplayMod(mod.id)}
          disabled={isToggling || isBatchToggling}
        >
          {isToggling ? "..." : mod.enabled ? "Disable" : "Enable"}
        </Button>
      );

      return (
        <GenericDetailListItem
          id={mod.id}
          isSelected={selectedModIds.has(mod.id)}
          onSelectionChange={(checked) =>
            handleModSelectionChange(mod.id, checked)
          }
          iconNode={itemIconNode}
          title={itemTitle}
          descriptionNode={itemDescriptionNode}
          mainActionNode={itemMainActionNode}
          accentColor={accentColor.value}
        />
      );
    },
    [
      accentColor.value,
      handleTogglepixelplayMod,
      localIcons,
      modBeingToggled,
      isBatchToggling,
      pixelplay_MODS_TAB_ICONS_TO_PRELOAD,
      selectedModIds,
      handleModSelectionChange, // Now correctly defined before this usage
    ],
  );

  const primaryLeftActionsContent = (
    <div className="flex flex-col gap-2 flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search pixelplay mods..."
          className="flex-grow !h-9"
          disabled={
            isLoading ||
            isRefreshingPacks ||
            isBatchToggling ||
            !profile.selected_pixelplay_pack_id
          }
        />
        <IconButton
          icon={
            isRefreshingPacks ? (
              <Icon icon="solar:refresh-bold" className="animate-spin" />
            ) : (
              <Icon icon="solar:refresh-outline" />
            )
          }
          onClick={handleRefreshPacks}
          disabled={
            isLoading ||
            isRefreshingPacks ||
            isBatchToggling ||
            !profile.selected_pixelplay_pack_id
          }
          variant="secondary"
          size="sm"
          title={
            isRefreshingPacks ? "Refreshing..." : "Refresh pixelplay Packs List"
          }
          className="!h-9 !w-9 flex-shrink-0"
        />
      </div>

      <div
        className="h-px w-full my-1"
        style={{ backgroundColor: `${accentColor.value}30` }}
      />

      <div className="flex items-center justify-between w-full min-h-14">
        <Checkbox
          customSize="md"
          checked={areAllFilteredSelected}
          onChange={(e) => handleSelectAllToggle(e.target.checked)}
          disabled={filteredMods.length === 0 || isBatchToggling || isLoading}
          label={
            selectedModIds.size > 0
              ? `${selectedModIds.size} selected`
              : "Select All"
          }
          title={
            areAllFilteredSelected
              ? "Deselect all visible"
              : "Select all visible"
          }
        />
        <div className="flex items-center gap-2">
          {selectedModIds.size > 0 && !!profile.selected_pixelplay_pack_id && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBatchToggleSelected}
              disabled={isBatchToggling || isLoading || isRefreshingPacks}
              icon={
                isBatchToggling ? (
                  <Icon
                    icon="solar:refresh-bold"
                    className="animate-spin mr-1.5"
                  />
                ) : undefined
              }
            >
              {isBatchToggling
                ? "Toggling..."
                : `Toggle Selected (${selectedModIds.size})`}
            </Button>
          )}
          {pixelplayPacksConfig && pixelplayPackOptions.length > 0 && (
            <div className="flex flex-col items-end">
              <Select
                value={profile.selected_pixelplay_pack_id || ""}
                onChange={(value) =>
                  handleSelectedPackChange(value === "" ? null : value)
                }
                options={pixelplayPackOptions}
                placeholder="Select Pack..."
                className="!h-9 text-sm min-w-[180px]"
                size="sm"
                disabled={isLoading || isRefreshingPacks || isBatchToggling}
              />
              {profile.selected_pixelplay_pack_id &&
                pixelplayPacksConfig?.packs[profile.selected_pixelplay_pack_id]
                  ?.isExperimental && (
                  <div className="text-xs text-yellow-500/80 font-minecraft mt-0.5 text-right">
                    Experimental Pack
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GenericContentTab<pixelplayModV2>
        items={profile.selected_pixelplay_pack_id ? filteredMods : []}
        renderListItem={renderpixelplayModItem}
        isLoading={isLoading && !!profile.selected_pixelplay_pack_id}
        error={error}
        searchQuery={searchQuery}
        primaryLeftActions={primaryLeftActionsContent}
        emptyStateIcon={pixelplay_MODS_TAB_ICONS_TO_PRELOAD[0]}
        emptyStateMessage={
          !profile.selected_pixelplay_pack_id
            ? "No pixelplay Pack Selected"
            : error
              ? "Error loading pixelplay mods"
              : isLoading &&
                  filteredMods.length === 0 &&
                  !!profile.selected_pixelplay_pack_id
                ? "Loading pixelplay mods..."
                : !searchQuery &&
                    filteredMods.length === 0 &&
                    !!profile.selected_pixelplay_pack_id
                  ? "No mods in this pixelplay pack."
                  : searchQuery &&
                      filteredMods.length === 0 &&
                      !!profile.selected_pixelplay_pack_id
                    ? "No pixelplay mods match your search."
                    : "Manage your pixelplay mods"
        }
        emptyStateDescription={
          !profile.selected_pixelplay_pack_id
            ? "Please select a pixelplay Modpack from the dropdown above to manage its mods."
            : error
              ? "Please try refreshing or check the console."
              : isLoading &&
                  filteredMods.length === 0 &&
                  !!profile.selected_pixelplay_pack_id
                ? "Please wait..."
                : !searchQuery &&
                    filteredMods.length === 0 &&
                    !!profile.selected_pixelplay_pack_id
                  ? "This pack might be empty, or mods are still loading."
                  : searchQuery &&
                      filteredMods.length === 0 &&
                      !!profile.selected_pixelplay_pack_id
                    ? "Try a different search term."
                    : "Toggle mods on or off for this profile."
        }
        loadingItemCount={
          isLoading &&
          !!profile.selected_pixelplay_pack_id &&
          pixelplayMods.length === 0
            ? 5
            : 0
        }
        showSkeletons={false}
        accentColorOverride={accentColor.value}
      />
    </>
  );
}
