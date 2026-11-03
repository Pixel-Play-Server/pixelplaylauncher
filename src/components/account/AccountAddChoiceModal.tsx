"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { Input } from "../ui/Input";
import { MinecraftAuthService, type MsaDeviceInfo } from "../../services/minecraft-auth-service";
import { toast } from "react-hot-toast";
import { useGlobalModal } from "../../hooks/useGlobalModal";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { useThemeStore } from "../../store/useThemeStore";
import { useTranslation } from "react-i18next";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMicrosoft: () => Promise<void>;
  onAccountCreated?: (createdAccountId: string) => void;
  modalWidth?: "sm" | "md" | "full";
}

export default function AccountAddChoiceModal({
  isOpen,
  onClose,
  onMicrosoft,
  onAccountCreated,
  modalWidth,
}: Props) {
  const { hideModal } = useGlobalModal();
  const { t } = useTranslation();
  const accent = useThemeStore((s) => s.accentColor.value);

  const resetCracked = () => {
    setCrackedStep("form");
    setCrackedName("");
    setCrackedPass("");
    setOfflineName("");
  };

  const close = () => {
    resetCracked();
    try {
      if (typeof onClose === "function") {
        onClose();
      } else {
        hideModal("add-account");
      }
    } catch {
      hideModal("add-account");
    }
  };

  const [method, setMethod] = useState<"microsoft" | "pixel" | "local">("pixel");
  const [offlineName, setOfflineName] = useState("");
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const [crackedStep, setCrackedStep] = useState<"form" | "link" | "verify">("form");
  const [crackedName, setCrackedName] = useState("");
  const [crackedPass, setCrackedPass] = useState("");
  const [pixelUser, setPixelUser] = useState("");
  const [pixelPass, setPixelPass] = useState("");
  const [isSubmittingPixel, setIsSubmittingPixel] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [msBusy, setMsBusy] = useState(false);
  const [device, setDevice] = useState<MsaDeviceInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const finishCreated = async (createdId: string) => {
    onAccountCreated?.(createdId);
    resetCracked();
    close();
  };

  const createLocalOffline = async (name: string) => {
    const promise = useMinecraftAuthStore.getState().createOfflineAccount(name);
    toast.promise(promise, {
      loading: t("accounts.offlineCreating"),
      success: (acct) =>
        t("accounts.offlineCreated", {
          name: acct.minecraft_username || acct.username,
        }),
      error: (err: unknown) =>
        t("accounts.offlineCreateFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
    });
    const created = await promise;
    await finishCreated(created.id);
  };

  const handleOfflineSubmit = async () => {
    if (!offlineName || offlineName.trim().length === 0) {
      toast.error(t("accounts.offlineNameRequired"));
      return;
    }

    setIsSubmittingOffline(true);
    const name = offlineName.trim();
    try {
      setLastError(null);
      const lookup = await MinecraftAuthService.lookupPixelAccount(name);
      setCrackedName(lookup.username || name);
      setCrackedPass("");
      if (lookup.exists) {
        setCrackedStep("verify");
      } else {
        setCrackedStep("link");
      }
    } catch (err) {
      console.error("Error looking up cracked account", err);
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      toast.error(t("accounts.offlineCreateFailed", { error: msg }));
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const handleLinkPixel = async () => {
    if (!crackedPass.trim()) {
      toast.error(t("accounts.pixelPasswordRequired"));
      return;
    }
    setIsSubmittingOffline(true);
    const name = crackedName || offlineName.trim();
    const promise = useMinecraftAuthStore.getState().reservePixelAccount(name, crackedPass);
    toast.promise(promise, {
      loading: t("accounts.pixelLinking"),
      success: (acct) => t("accounts.pixelCreated", { name: acct.minecraft_username || acct.username }),
      error: (err: unknown) =>
        t("accounts.pixelFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
    });
    try {
      setLastError(null);
      const created = await promise;
      await finishCreated(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const handleVerifyPixel = async () => {
    if (!crackedPass) {
      toast.error(t("accounts.pixelPasswordRequired"));
      return;
    }
    setIsSubmittingOffline(true);
    const name = crackedName || offlineName.trim();
    const promise = useMinecraftAuthStore.getState().loginPixelAccount(name, crackedPass);
    toast.promise(promise, {
      loading: t("accounts.pixelConnecting"),
      success: (acct) => t("accounts.pixelCreated", { name: acct.minecraft_username || acct.username }),
      error: (err: unknown) =>
        t("accounts.pixelFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
    });
    try {
      setLastError(null);
      const created = await promise;
      await finishCreated(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const handleSkipLink = async () => {
    const name = crackedName || offlineName.trim();
    if (!name) {
      return;
    }
    setIsSubmittingOffline(true);
    try {
      setLastError(null);
      await createLocalOffline(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(t("accounts.codeCopied"));
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("accounts.copyFailed"));
    }
  };

  const handlePixelLogin = async () => {
    if (!pixelUser.trim() || !pixelPass) {
      toast.error(t("accounts.pixelRequired"));
      return;
    }
    setIsSubmittingPixel(true);
    setLastError(null);
    const promise = useMinecraftAuthStore.getState().loginPixelAccount(pixelUser.trim(), pixelPass);
    toast.promise(promise, {
      loading: t("accounts.pixelConnecting"),
      success: (acct) => t("accounts.pixelCreated", { name: acct.minecraft_username || acct.username }),
      error: (err: unknown) =>
        t("accounts.pixelFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
    });
    try {
      const created = await promise;
      onAccountCreated?.(created.id);
      setPixelUser("");
      setPixelPass("");
      close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
    } finally {
      setIsSubmittingPixel(false);
    }
  };

  const handleMicrosoft = async () => {
    setMsBusy(true);
    setLastError(null);
    setDevice(null);
    try {
      await useMinecraftAuthStore.getState().addAccount(async (info) => {
        setDevice(info);
        if (info.user_code) {
          try {
            await navigator.clipboard.writeText(info.user_code);
            setCopied(true);
          } catch {
            /* ignore */
          }
        }
      });
      await useMinecraftAuthStore.getState().initializeAccounts();
      close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
    } finally {
      setMsBusy(false);
    }
  };

  if (!isOpen) return null;
  const width = modalWidth === "full" ? "md" : (modalWidth || "md");

  const innerMaxClass = width === "sm" ? "max-w-md" : width === "md" ? "max-w-2xl" : "max-w-4xl";
  const wrapperHeightClass = "";

  return (
    <Modal title={t("accounts.addAccount")} onClose={close} width={width} >
      <div className={`p-5 space-y-4 font-minecraft-ten text-sm ${wrapperHeightClass}`}>
        {lastError && <p role="alert" className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-xs break-words">{lastError}</p>}
        {device?.user_code ? (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <p className="text-white/75 font-minecraft-ten text-sm">
              {t("accounts.msCodeHint")}
            </p>
            <button
              type="button"
              onClick={() => copyCode(device.user_code)}
              className="w-full py-5 px-4 border-2 border-b-4 rounded-md"
              style={{
                backgroundColor: `${accent}28`,
                borderColor: `${accent}aa`,
                boxShadow: "0 4px 0 rgba(0,0,0,0.35), 0 8px 18px rgba(0,0,0,0.4)",
              }}
              title={t("accounts.copyCode")}
            >
              <span className="block font-minecraft text-4xl tracking-[0.35em] text-white normal-case">
                {device.user_code}
              </span>
              <span className="block mt-2 text-xs text-white/60 font-minecraft-ten">
                {copied ? t("accounts.copied") : t("accounts.clickToCopy")}
              </span>
            </button>
            <p className="text-white/55 font-minecraft-ten text-xs">
              {t("accounts.msWaiting")}
            </p>
            <Button
              variant="default"
              className="w-full"
              onClick={() => {
                const url =
                  device.verification_uri_complete ||
                  device.verification_uri ||
                  "https://www.microsoft.com/link";
                window.open(url, "_blank");
              }}
            >
              {t("accounts.openMicrosoft")}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-white/55 text-xs">{t("accounts.chooseMethod")}</p>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-black/30 p-1 border border-white/10" role="tablist" aria-label={t("accounts.chooseMethod")}>
              {(["pixel", "microsoft", "local"] as const).map(value => <button type="button" role="tab" aria-selected={method === value} key={value} disabled={msBusy || isSubmittingPixel || isSubmittingOffline} onClick={() => { setMethod(value); setLastError(null); }} className={`px-2 py-3 rounded text-xs transition-colors ${method === value ? "bg-white/10 text-white" : "text-white/45 hover:text-white"}`}>{value === "pixel" ? "Pixel" : value === "microsoft" ? "Microsoft" : "Local"}</button>)}
            </div>

            <div className={`flex flex-col justify-center items-center gap-6 w-full ${innerMaxClass} mx-auto`}>
              {method === "microsoft" && <Button variant="default" onClick={handleMicrosoft} className="w-full" disabled={msBusy}>
                {msBusy ? t("accounts.connecting") : t("accounts.signInMicrosoft")}
              </Button>}

              {method === "pixel" && <div className="w-full">
                <p className="text-white/60 text-xs mb-4">{t("accounts.pixelHint")}</p>
                <div className="flex flex-col gap-2">
                  <Input aria-label={t("accounts.username")} autoComplete="username" value={pixelUser} onChange={(e) => setPixelUser(e.target.value)} placeholder={t("accounts.username")} />
                  <Input aria-label={t("accounts.pixelPassword")} autoComplete="current-password" type="password" value={pixelPass} onChange={(e) => setPixelPass(e.target.value)} placeholder={t("accounts.pixelPassword")} />
                  <Button variant="default" onClick={handlePixelLogin} disabled={isSubmittingPixel}>
                    {isSubmittingPixel ? t("accounts.connecting") : t("accounts.signInPixel")}
                  </Button>
                </div>
                <p className="text-white/45 text-xs mt-2">{t("accounts.pixelReserveHint")}</p>
              </div>}

              {method === "local" && <div className="w-full">
                {crackedStep === "link" ? (
                  <>
                    <p className="text-white font-minecraft text-2xl normal-case mb-2">
                      {t("accounts.crackedLinkTitle", { name: crackedName })}
                    </p>
                    <p className="text-white/70 text-sm mb-3">{t("accounts.crackedLinkHint", { name: crackedName })}</p>
                    <Input
                      type="password"
                      value={crackedPass}
                      onChange={(e) => setCrackedPass(e.target.value)}
                      placeholder={t("accounts.pixelPassword")}
                    />
                    <div className="flex gap-2 mt-3">
                      <Button variant="success" onClick={handleLinkPixel} disabled={isSubmittingOffline} className="flex-1">
                        {isSubmittingOffline ? t("accounts.connecting") : t("accounts.crackedLinkYes")}
                      </Button>
                      <Button variant="ghost" onClick={handleSkipLink} disabled={isSubmittingOffline}>
                        {t("accounts.crackedLinkNo")}
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="mt-3 text-white/50 text-xs font-minecraft-ten"
                      onClick={() => setCrackedStep("form")}
                    >
                      {t("common.back")}
                    </button>
                  </>
                ) : crackedStep === "verify" ? (
                  <>
                    <p className="text-white font-minecraft text-2xl normal-case mb-2">
                      {t("accounts.crackedVerifyTitle")}
                    </p>
                    <p className="text-white/70 text-sm mb-3">{t("accounts.crackedVerifyHint")}</p>
                    <Input value={crackedName} readOnly placeholder={t("accounts.username")} />
                    <div className="mt-2">
                      <Input
                        type="password"
                        value={crackedPass}
                        onChange={(e) => setCrackedPass(e.target.value)}
                        placeholder={t("accounts.pixelPassword")}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="success" onClick={handleVerifyPixel} disabled={isSubmittingOffline} className="flex-1">
                        {isSubmittingOffline ? t("accounts.connecting") : t("accounts.crackedVerify")}
                      </Button>
                      <Button variant="ghost" onClick={() => setCrackedStep("form")} disabled={isSubmittingOffline}>
                        {t("common.back")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-white/70 text-sm mb-3">{t("accounts.offlineHint")}</p>
                    <div className="flex gap-2">
                      <Input value={offlineName} onChange={(e) => setOfflineName(e.target.value)} placeholder={t("accounts.username")} />
                      <Button variant="success" onClick={handleOfflineSubmit} disabled={isSubmittingOffline}>
                        {isSubmittingOffline ? t("accounts.creating") : t("common.create")}
                      </Button>
                    </div>
                  </>
                )}
              </div>}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
