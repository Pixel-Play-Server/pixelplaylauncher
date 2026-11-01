"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../../types/profile";
import { useThemeStore } from "../../../store/useThemeStore";
import { SearchStyleInput } from "../../ui/Input";
import { Checkbox } from "../../ui/Checkbox";
import { gsap } from "gsap";
import { ProfileIcon } from "../ProfileIcon";
import { useTranslation } from "react-i18next";

interface GeneralSettingsTabProps {
  profile: Profile;
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  onRefresh?: () => Promise<Profile>;
  onDelete?: () => void;
  isDeleting?: boolean;
}



export function GeneralSettingsTab({
  profile,
  editedProfile,
  updateProfile,
  onRefresh,
  onDelete,
  isDeleting,
}: GeneralSettingsTabProps) {
  const { t } = useTranslation();
  const accentColor = useThemeStore((state) => state.accentColor);
  const isBackgroundAnimationEnabled = useThemeStore(
    (state) => state.isBackgroundAnimationEnabled,
  );
  const tabRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBackgroundAnimationEnabled) {
      if (tabRef.current) {
        gsap.fromTo(
          tabRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: "power2.out" },
        );
      }

      if (formRef.current) {
        gsap.fromTo(
          formRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0.2,
          },
        );
      }


    }
  }, [isBackgroundAnimationEnabled]);



  return (
    <div ref={tabRef} className="space-y-6 select-none">
      <div ref={formRef} className="space-y-6">
        <div className="flex gap-6">
          <div className="flex-1 flex flex-col">
            <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
              {t("profile.profileName")}
            </label>
            <div className="flex items-center gap-4">
              <ProfileIcon
                profileId={profile.id}
                banner={profile.banner}
                profileName={profile.name}
                accentColor={accentColor.value}
                onSuccessfulUpdate={async () => {
                  try {
                    if (onRefresh) {
                      await onRefresh();
                    }
                  } catch (error) {
                    console.error("Failed to refresh profile after icon update:", error);
                  }
                }}
                className="w-12 h-12 flex-shrink-0"
              />
              <SearchStyleInput
                value={editedProfile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder={t("profile.namePlaceholder")}
                className="text-xl flex-1"
                disabled={profile.is_standard_version ? true : false}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
              {t("profile.group")}
            </label>
            <div className="flex items-center">
              <SearchStyleInput
                value={editedProfile.group || ""}
                onChange={(e) => updateProfile({ group: e.target.value || null })}
                placeholder={t("profile.groupPlaceholder")}
                className="text-xl w-full"
                disabled={profile.is_standard_version ? true : false}
              />
            </div>
          </div>
        </div>

        {/* Shared Minecraft Folder Checkbox */}
        <div className="space-y-1">
          <Checkbox
            label={t("profile.sharedFolder")}
            checked={editedProfile.use_shared_minecraft_folder ?? false}
            onChange={(event) => {
              const newValue = event.target.checked;
              updateProfile({
                use_shared_minecraft_folder: newValue
              });
            }}
            description={t("profile.sharedFolderDescription")}
            descriptionClassName="font-minecraft-ten text-sm"
            size="lg"
          />
          <p className="text-xs text-white/50 font-minecraft-ten ml-10 -mt-1">
            {t("profile.sharedFolderHint")}
          </p>
        </div>

        <div>
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            {t("profile.quickPlayPath")}
          </label>
          <SearchStyleInput
            value={editedProfile.settings.quick_play_path || ""}
            onChange={(e) =>
              updateProfile({
                settings: {
                  ...editedProfile.settings,
                  quick_play_path: e.target.value || null
                }
              })
            }
            placeholder={t("profile.quickPlayPlaceholder")}
            className="text-xl"
          />
          <p className="text-xs text-white/70 mt-2 font-minecraft-ten tracking-wide select-none">
            {t("profile.quickPlayDescription")}
          </p>
        </div>

        <div>
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            {t("settings.preLaunchHook")}
          </label>
          <SearchStyleInput
            value={editedProfile.settings.hooks?.pre_launch || ""}
            onChange={(e) =>
              updateProfile({
                settings: {
                  ...editedProfile.settings,
                  hooks: {
                    ...(editedProfile.settings.hooks || {
                      pre_launch: null,
                      wrapper: null,
                      post_exit: null,
                    }),
                    pre_launch: e.target.value || null,
                  },
                },
              })
            }
            placeholder={t("profile.preLaunchPlaceholder")}
            className="text-xl"
          />
        </div>

        <div>
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            {t("settings.wrapperHook")}
          </label>
          <SearchStyleInput
            value={editedProfile.settings.hooks?.wrapper || ""}
            onChange={(e) =>
              updateProfile({
                settings: {
                  ...editedProfile.settings,
                  hooks: {
                    ...(editedProfile.settings.hooks || {
                      pre_launch: null,
                      wrapper: null,
                      post_exit: null,
                    }),
                    wrapper: e.target.value || null,
                  },
                },
              })
            }
            placeholder={t("profile.wrapperPlaceholder")}
            className="text-xl"
          />
        </div>

        <div>
          <label className="block text-3xl font-minecraft text-white mb-2 lowercase">
            {t("settings.postExitHook")}
          </label>
          <SearchStyleInput
            value={editedProfile.settings.hooks?.post_exit || ""}
            onChange={(e) =>
              updateProfile({
                settings: {
                  ...editedProfile.settings,
                  hooks: {
                    ...(editedProfile.settings.hooks || {
                      pre_launch: null,
                      wrapper: null,
                      post_exit: null,
                    }),
                    post_exit: e.target.value || null,
                  },
                },
              })
            }
            placeholder={t("profile.postExitPlaceholder")}
            className="text-xl"
          />
        </div>


      </div>


    </div>
  );
}
