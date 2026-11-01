"use client";

import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useTranslation } from "react-i18next";

interface GroupMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
  onMigrate?: () => void;
  profileId?: string;
}

export function GroupMigrationModal({
  isOpen,
  onClose,
  onLaunch,
  onMigrate,
}: GroupMigrationModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <Modal title={t("migration.title")} onClose={onClose} width="md">
      <div className="p-6">
        <p className="text-white/80 mb-6 text-center font-minecraft-ten">
          {t("migration.description")}
        </p>

        <div className="flex gap-4 justify-center mt-8">
          {onMigrate && (
            <Button onClick={onMigrate} variant="default" size="md">
              {t("migration.copyFiles")}
            </Button>
          )}
          <Button onClick={onLaunch} variant="flat-secondary" size="md">
            {t("migration.skipLaunch")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
