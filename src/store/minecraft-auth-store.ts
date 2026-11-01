import { create } from "zustand";
import { MinecraftAuthService, type MsaDeviceInfo } from "../services/minecraft-auth-service";
import type { MinecraftAccount } from "../types/minecraft";
import flagsmith from 'flagsmith';
import { toast } from "react-hot-toast";

// Helper function to identify the user with Flagsmith
const identifyWithFlagsmith = (account: MinecraftAccount | null) => {
  if (account && account.id) {
    flagsmith.identify(account.id)
      .then(() => {
        console.log(`[AuthStore] Flagsmith user identified: ${account.id}`);
      })
      .catch((error) => {
        console.error(`[AuthStore] Error identifying Flagsmith user ${account.id}:`, error);
      });
  } else {
    flagsmith.logout()
      .then(() => {
        console.log("[AuthStore] Flagsmith user logged out (no active account).");
      })
      .catch((error) => {
        console.error("[AuthStore] Error logging out Flagsmith user:", error);
      });
  }
};

async function loadAccountsIntoStore(
  set: (partial: Partial<MinecraftAuthState>) => void,
) {
  const activeAccount = await MinecraftAuthService.getActiveAccount();
  const accounts = await MinecraftAuthService.getAccounts();
  const updatedAccounts = accounts
    .filter((account) => Boolean(account.id))
    .map((account) => ({
      ...account,
      active: activeAccount ? account.id === activeAccount.id : false,
    }));
  set({
    accounts: updatedAccounts,
    activeAccount,
    isLoading: false,
    error: null,
  });
  identifyWithFlagsmith(activeAccount);
}

interface MinecraftAuthState {
  accounts: MinecraftAccount[];
  activeAccount: MinecraftAccount | null;
  isLoading: boolean;
  error: string | null;

  initializeAccounts: () => Promise<void>;
  addAccount: (onDevice?: (info: MsaDeviceInfo) => void) => Promise<void>;
  createOfflineAccount: (username: string) => Promise<MinecraftAccount>;
  loginPixelAccount: (username: string, password: string) => Promise<MinecraftAccount>;
  reservePixelAccount: (username: string, password: string) => Promise<MinecraftAccount>;
  removeAccount: (accountId: string) => Promise<void>;
  setActiveAccount: (accountId: string) => Promise<void>;
}

export const useMinecraftAuthStore = create<MinecraftAuthState>((set, get) => ({
  accounts: [],
  activeAccount: null,
  isLoading: false,
  error: null,

  initializeAccounts: async () => {
    try {
      set({ isLoading: true, error: null });
      await loadAccountsIntoStore(set);
    } catch (error) {
      console.error("Failed to initialize accounts:", error);
      set({
        error: `Failed to load accounts: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
      identifyWithFlagsmith(null);
    }
  },

  loginPixelAccount: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const created = await MinecraftAuthService.loginPixelAccount(username, password);
      await loadAccountsIntoStore(set);
      return created;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({
        error: `Failed to login Pixel account: ${errorMessage}`,
        isLoading: false,
      });
      throw error;
    }
  },

  reservePixelAccount: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const created = await MinecraftAuthService.reservePixelAccount(username, password);
      await loadAccountsIntoStore(set);
      return created;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({
        error: `Failed to reserve Pixel account: ${errorMessage}`,
        isLoading: false,
      });
      throw error;
    }
  },

  createOfflineAccount: async (username: string) => {
    set({ isLoading: true, error: null });
    try {
      const created = await MinecraftAuthService.createOfflineAccount(username);
      await loadAccountsIntoStore(set);
      return created;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      set({
        error: `Failed to create offline account: ${errorMessage}`,
        isLoading: false,
      });
      throw error;
    }
  },

  addAccount: async (onDevice) => {
    set({ isLoading: true, error: null });
    const toastId = "msa-login";

    try {
      toast.loading("Conectando con Microsoft…", { id: toastId, duration: 60000 });
      const newAccount = await MinecraftAuthService.beginLogin((info) => {
        onDevice?.(info);
        toast.loading(
          `Código: ${info.user_code}  —  abrí microsoft.com/link`,
          { id: toastId, duration: 120000 },
        );
      });
      if (!newAccount) {
        throw new Error("Login cancelled by user.");
      }

      await loadAccountsIntoStore(set);
      toast.success(`Cuenta '${newAccount.username}' agregada.`, { id: toastId, duration: 2000 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("cancelled by user")) {
        console.error("Failed to add account:", error);
        set({ error: `Failed to add account: ${errorMessage}` });
        toast.error(errorMessage, { id: toastId, duration: 2500 });
        throw error;
      } else {
        console.log("Account add cancelled by user.");
        toast.dismiss(toastId);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  removeAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });
      await MinecraftAuthService.removeAccount(accountId);
      await loadAccountsIntoStore(set);
    } catch (error) {
      console.error("Failed to remove account:", error);
      set({
        error: `Failed to remove account: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false,
      });
    }
  },

  setActiveAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });

      await MinecraftAuthService.setActiveAccount(accountId);
      await loadAccountsIntoStore(set);
    } catch (error) {
      console.error("Failed to set active account:", error);
      const message =
        error instanceof Error ? error.message : String(error);
      try {
        await loadAccountsIntoStore(set);
      } catch {
        // keep the original error if reload also fails
      }
      const stillActive = get().activeAccount;
      const missing =
        /cuenta no encontrada|not found/i.test(message) && !!stillActive;
      set({
        error: missing ? null : `Failed to set active account: ${message}`,
        isLoading: false,
      });
    }
  },
}));
