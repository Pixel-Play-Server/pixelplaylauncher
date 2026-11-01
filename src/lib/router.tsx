import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { App } from "../App";
import { PlayTab } from "../components/tabs/PlayTab";

function lazyNamed<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return lazy(async () => ({
    default: (await load())[name] as ComponentType,
  }));
}

const ProfilesTab = lazyNamed(() => import("../components/tabs/ProfilesTab"), "ProfilesTab");
const ProfilesTabV2 = lazyNamed(() => import("../components/tabs/ProfilesTabV2"), "ProfilesTabV2");
const ModrinthTabV2 = lazy(() => import("../components/tabs/ModrinthTabV2"));
const SkinsTab = lazyNamed(() => import("../components/tabs/SkinsTab"), "SkinsTab");
const StoreTab = lazyNamed(() => import("../components/tabs/StoreTab"), "StoreTab");
const SettingsTab = lazyNamed(() => import("../components/tabs/SettingsTab"), "SettingsTab");
const FriendsTab = lazyNamed(() => import("../components/tabs/FriendsTab"), "FriendsTab");
const SurvivalTab = lazyNamed(() => import("../components/tabs/SurvivalTab"), "SurvivalTab");
const BrowseTab = lazyNamed(() => import("../components/profiles/detail/BrowseTab"), "BrowseTab");
const BrowseTabWrapper = lazyNamed(
  () => import("../components/profiles/BrowseTabWrapper"),
  "BrowseTabWrapper",
);
const ProfileDetailViewV2Wrapper = lazyNamed(
  () => import("../components/profiles/ProfileDetailViewV2Wrapper"),
  "ProfileDetailViewV2Wrapper",
);

function TabFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="h-7 w-7 border-2 border-white/10 animate-spin"
        style={{ borderTopColor: "rgb(var(--accent-rgb, 16 185 129))" }}
      />
    </div>
  );
}

const s = (node: ReactNode) => <Suspense fallback={<TabFallback />}>{node}</Suspense>;

/** Warm up the most visited tabs once the launcher is idle. */
export function prefetchTabs() {
  const run = () => {
    void import("../components/tabs/ProfilesTabV2");
    void import("../components/tabs/FriendsTab");
    void import("../components/tabs/SkinsTab");
    void import("../components/tabs/SettingsTab");
  };
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (ric) ric(run);
  else window.setTimeout(run, 1500);
}

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/play" replace /> },
      { path: "play", element: <PlayTab /> },
      { path: "profiles/:profileId", element: s(<ProfilesTab />) },
      { path: "profilesv2/:profileId", element: s(<ProfileDetailViewV2Wrapper />) },
      { path: "profilesv2/:profileId/browse/:contentType", element: s(<BrowseTabWrapper />) },
      { path: "profiles", element: s(<ProfilesTabV2 />) },
      { path: "profiles/:profileId/browse/:contentType", element: s(<BrowseTab />) },
      { path: "mods", element: s(<ModrinthTabV2 />) },
      { path: "skins", element: s(<SkinsTab />) },
      { path: "friends", element: s(<FriendsTab />) },
      { path: "survival", element: s(<SurvivalTab />) },
      { path: "capes", element: s(<StoreTab />) },
      { path: "settings", element: s(<SettingsTab />) },
    ],
  },
]);
