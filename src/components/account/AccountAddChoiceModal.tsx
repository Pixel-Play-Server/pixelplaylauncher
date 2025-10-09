"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { Input } from "../ui/Input";
import { MinecraftAuthService } from "../../services/minecraft-auth-service";
import { toast } from "react-hot-toast";
import { useGlobalModal } from "../../hooks/useGlobalModal";

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

  const close = () => {
    try {
      if (typeof onClose === "function") {
        onClose();
      } else {
        hideModal("add-account");
      }
    } catch (err) {
      hideModal("add-account");
    }
  };

  const [offlineName, setOfflineName] = useState("");
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleOfflineSubmit = async () => {
    if (!offlineName || offlineName.trim().length === 0) {
      toast.error("Please enter a username for offline account");
      return;
    }

    setIsSubmittingOffline(true);
    const promise = MinecraftAuthService.createOfflineAccount(offlineName.trim());

    toast.promise(promise, {
      loading: "Creating offline account...",
      success: (acct: any) => `Offline account '${acct.username}' created`,
      error: (err: any) => `Failed: ${err instanceof Error ? err.message : String(err)}`,
    });

    try {
      setLastError(null);
      const created = await promise;
      onAccountCreated?.(created.id);
      setOfflineName("");
      close();
    } catch (err) {
      console.error("Error creating offline account", err);
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      toast.error(`Failed to create offline account: ${msg}`);
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const handleMicrosoft = async () => {
    await onMicrosoft();
    close();
  };

  if (!isOpen) return null;
  const width = modalWidth || "full";

  const innerMaxClass = width === "sm" ? "max-w-md" : width === "md" ? "max-w-2xl" : "max-w-4xl";
  const wrapperHeightClass = width === "full" ? "h-[90vh] flex flex-col" : "";

  return (
    <Modal title="Add account" onClose={close} width={width} className={width === "full" ? "h-[90vh]" : ""}>
      <div className={`p-6 space-y-6 ${wrapperHeightClass}`}>
        <p className="text-white/70">Choose how you want to add an account:</p>

        <div className={`flex flex-col justify-center items-center gap-6 w-full ${innerMaxClass} mx-auto`}>
          <Button variant="default" onClick={handleMicrosoft} className="w-full">
            Sign in with Microsoft
          </Button>

          <div className="bg-white/5 p-4 rounded-md w-full">
            <p className="text-white/70 text-sm mb-3">Create an offline account (local only)</p>
            <div className="flex gap-2">
              <Input value={offlineName} onChange={(e) => setOfflineName(e.target.value)} placeholder="Username" />
              <Button variant="success" onClick={handleOfflineSubmit} disabled={isSubmittingOffline}>
                {isSubmittingOffline ? "Creating..." : "Create"}
              </Button>
            </div>
            {lastError && (
              <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-md text-sm">
                <div className="text-red-200 mb-2">Error: {lastError}</div>
                <div className="flex gap-2">
                  <Button variant="default" onClick={handleOfflineSubmit} disabled={isSubmittingOffline}>
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
