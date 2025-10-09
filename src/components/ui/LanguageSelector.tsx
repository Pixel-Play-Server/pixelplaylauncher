"use client";

import { Icon } from "@iconify/react";
import { Select } from "./Select";
import { useTranslation } from "react-i18next";
import { setLanguagePreference } from "../../services/launcher-config-service";
import { toast } from "react-hot-toast";

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
];

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await i18n.changeLanguage(newLanguage);
      await setLanguagePreference(newLanguage);
      toast.success(i18n.t("settings.settingsSaved"));
    } catch (error) {
      console.error("Failed to change language:", error);
      toast.error(i18n.t("errors.unknownError"));
    }
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const languageOptions = languages.map(lang => ({
    value: lang.code,
    label: `${lang.flag} ${lang.name}`,
    icon: <Icon icon="solar:translation-bold" className="w-4 h-4" />,
  }));

  return (
    <Select
      variant="flat"
      value={i18n.language}
      onChange={handleLanguageChange}
      options={languageOptions}
      className={className}
    />
  );
}
