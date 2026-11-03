"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { useMinecraftAuthStore } from "../../store/minecraft-auth-store";
import { PlayerHeadshot } from "./PlayerHeadshot";

interface MinecraftAccountManagerProps {
  onClose: () => void;
  isInDropdown?: boolean;
  onRequestAddAccount?: () => void;
}

export function MinecraftAccountManager({ onClose, isInDropdown, onRequestAddAccount }: MinecraftAccountManagerProps) {
  const { t } = useTranslation();
  const { accounts, activeAccount, isLoading, error, addAccount, removeAccount, setActiveAccount } = useMinecraftAuthStore();
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    setLocalError(null);
    try { await action(); } catch (err) { setLocalError(String(err instanceof Error ? err.message : err)); }
  };
  const content = (
    <div className="flex flex-col min-h-0 font-minecraft-ten">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
        <div>
          <h3 className="text-base text-white">{t("accounts.title")}</h3>
          <p className="text-xs text-white/45 mt-1">{accounts.length} {accounts.length === 1 ? "cuenta guardada" : "cuentas guardadas"}</p>
        </div>
        {isInDropdown && <button type="button" aria-label={t("common.close")} onClick={onClose} className="p-2 rounded hover:bg-white/10 text-white/60"><Icon icon="solar:close-circle-linear" className="w-5 h-5" /></button>}
      </div>
      {(localError || error) && <p role="alert" className="text-xs text-red-300 bg-red-500/10 p-3 mx-3 mt-3 rounded break-words">{localError || error}</p>}
      <div className="overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[min(50vh,420px)]">
        {accounts.length === 0 && <p className="text-sm text-white/50 p-5 text-center">{t(isLoading ? "accounts.loading" : "accounts.empty")}</p>}
        {[...accounts].sort((a, b) => Number(b.id === activeAccount?.id) - Number(a.id === activeAccount?.id)).map(account => {
          const active = account.id === activeAccount?.id;
          const name = account.minecraft_username || account.username;
          return (
            <div key={account.id} className={`rounded-md border overflow-hidden ${active ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="flex items-center gap-1 p-2">
                <button type="button" disabled={isLoading || active} aria-pressed={active} aria-label={`Usar cuenta ${name}`} onClick={() => void run(async () => {
                  await setActiveAccount(account.id);
                  if (useMinecraftAuthStore.getState().activeAccount?.id === account.id) onClose();
                })} className="flex flex-1 items-center text-left gap-3 min-w-0 p-1 rounded hover:bg-white/5 disabled:hover:bg-transparent">
                  <div className="w-9 h-9 flex-shrink-0 overflow-hidden rounded bg-black/30"><PlayerHeadshot playerName={name} size={36} alt={name} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate" title={name}>{name}</p>
                    <p className="text-[11px] text-white/50 mt-1">{account.pixel_account ? "Pixel" : account.offline ? "Local" : "Microsoft"}{active ? " · Activa" : ""}</p>
                  </div>
                  {active && <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
                <button type="button" aria-label={`${t("accounts.remove")}: ${name}`} title={t("accounts.remove")} disabled={isLoading} onClick={() => setPendingRemoval(pendingRemoval === account.id ? null : account.id)} className="p-2 text-white/35 hover:text-red-300 hover:bg-red-500/10 rounded disabled:opacity-40">
                  <Icon icon="solar:logout-2-linear" className="w-4 h-4" />
                </button>
              </div>
              {pendingRemoval === account.id && <div className="border-t border-white/10 p-3 space-y-2">
                <p className="text-xs text-white/70">¿Quitar esta cuenta del launcher?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={isLoading} onClick={() => void run(async () => { await removeAccount(account.id); setPendingRemoval(null); })}>{t("accounts.remove")}</Button>
                  <Button size="sm" variant="ghost" disabled={isLoading} onClick={() => setPendingRemoval(null)}>{t("common.cancel")}</Button>
                </div>
              </div>}
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-white/10">
        <Button size="sm" className="w-full" disabled={isLoading} onClick={() => onRequestAddAccount ? onRequestAddAccount() : void run(addAccount)} icon={<Icon icon="solar:add-circle-linear" className="w-4 h-4" />}>{t("accounts.addAccount")}</Button>
      </div>
    </div>
  );
  return isInDropdown ? content : <Modal title={t("accounts.managerTitle")} onClose={onClose} width="md">{content}</Modal>;
}
