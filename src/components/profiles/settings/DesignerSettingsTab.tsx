"use client";

import type { Profile } from "../../../types/profile";
import { Checkbox } from "../../ui/Checkbox";
import { useTranslation } from "react-i18next";
// import { Label } from "../../ui/Label"; // No longer needed for this specific checkbox

interface DesignerSettingsTabProps {
  editedProfile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

export function DesignerSettingsTab({
  editedProfile,
  updateProfile,
}: DesignerSettingsTabProps) {
  const { t } = useTranslation();
  
  const handleKeepLocalAssetsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateProfile({
      pixelplay_information: {
        ...(editedProfile.pixelplay_information || { 
          is_experimental: editedProfile.pixelplay_information?.is_experimental || false 
        }), 
        keep_local_assets: event.target.checked,
      },
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h3 className="text-3xl font-minecraft text-white mb-3 lowercase">
          {t("profile.assetManagement")}
        </h3>
        <div className="p-0">
          <div className="flex items-center space-x-3 mb-2">
            <Checkbox
              id="keepLocalAssetsDesigner"
              label={t("profile.keepLocalAssets")}
              checked={
                editedProfile.pixelplay_information?.keep_local_assets || false
              }
              onChange={handleKeepLocalAssetsChange}
              variant="flat"
              className="text-2xl"
            />
          </div>
          <p className="text-xs text-white/70 font-minecraft-ten tracking-wide select-none pl-1">
            {t("profile.keepLocalAssetsDescription")}
          </p>
        </div>
      </div>
      {/* Add more designer-specific settings here in the future if needed */}
    </div>
  );
} 