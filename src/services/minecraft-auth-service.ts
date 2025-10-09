import { invoke } from "@tauri-apps/api/core";
import { v4 as uuidv4 } from "uuid";
import type { MinecraftAccount } from "../types/minecraft";

export class MinecraftAuthService {
  static async beginLogin(): Promise<MinecraftAccount | null> {
    try {
      return await invoke<MinecraftAccount | null>("begin_login");
    } catch (error) {
      console.error("Failed to begin login:", error);
      throw error;
    }
  }

  static async removeAccount(accountId: string): Promise<void> {
    try {
      await invoke("remove_account", { accountId });
    } catch (error) {
      console.error("Failed to remove account:", error);
      throw error;
    }
  }

  static async getActiveAccount(): Promise<MinecraftAccount | null> {
    try {
      return await invoke<MinecraftAccount | null>("get_active_account");
    } catch (error) {
      console.error("Failed to get active account:", error);
      throw error;
    }
  }

  static async setActiveAccount(accountId: string): Promise<void> {
    try {
      await invoke("set_active_account", { accountId });
    } catch (error) {
      console.error("Failed to set active account:", error);
      throw error;
    }
  }

  static async getAccounts(): Promise<MinecraftAccount[]> {
    try {
      return await invoke<MinecraftAccount[]>("get_accounts");
    } catch (error) {
      console.error("Failed to get accounts:", error);
      throw error;
    }
  }

  static async createOfflineAccount(username: string): Promise<MinecraftAccount> {
    try {
      return await invoke<MinecraftAccount>("create_offline_account", { username });
    } catch (error) {
      console.error("Failed to create offline account:", error);
      // If the bare command is not found, try the fallback that accepts a client-generated id.
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("plugin not found") || msg.toLowerCase().includes("command not found")) {
        // generate UUID client-side and attempt to persist using the backend command that accepts id
        const id = uuidv4();
        try {
          return await invoke<MinecraftAccount>("create_offline_account_with_id", { id, username });
        } catch (err2) {
          console.error("Fallback create_offline_account_with_id failed:", err2);
          // rethrow original error for upper layers to handle
          throw error;
        }
      }

      throw error;
    }
  }
}
