import { invoke } from "@tauri-apps/api/core";
import { v4 as uuidv4 } from "uuid";
import type { MinecraftAccount } from "../types/minecraft";

export type MsaDeviceInfo = {
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  message?: string;
  expires_in?: number;
};

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function normalizeMinecraftAccount(raw: unknown): MinecraftAccount | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const username = pickString(obj, "username", "Username", "minecraft_username");
  const id = pickString(obj, "id", "ID");
  if (!id && !username) {
    return null;
  }
  return {
    id,
    username,
    minecraft_username: pickString(obj, "minecraft_username") || username,
    active: Boolean(obj.active ?? obj.Active),
    access_token: pickString(obj, "access_token", "AccessToken"),
    refresh_token: pickString(obj, "refresh_token", "RefreshToken") || undefined,
    expires_at: pickString(obj, "expires_at", "expires", "Expires") || undefined,
    offline: Boolean(obj.offline) || !pickString(obj, "access_token", "AccessToken"),
    kind: pickString(obj, "kind") || undefined,
    rank: pickString(obj, "rank") || undefined,
    rank_label: pickString(obj, "rank_label", "rankLabel") || undefined,
    rank_color: pickString(obj, "rank_color", "rankColor") || undefined,
    pixel_account: Boolean(obj.pixel_account || obj.pixelAccount),
  };
}

export type PixelLookup = {
  exists: boolean;
  username: string;
  kind?: string;
  rank?: string;
};

function normalizeAccountList(raw: unknown): MinecraftAccount[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => normalizeMinecraftAccount(item))
    .filter((item): item is MinecraftAccount => item !== null);
}

export class MinecraftAuthService {
  static async beginLogin(
    onDevice?: (info: MsaDeviceInfo) => void,
  ): Promise<MinecraftAccount | null> {
    try {
      const info = await invoke<MsaDeviceInfo>("start_msa_login");
      if (info?.user_code) {
        onDevice?.(info);
      }
      return normalizeMinecraftAccount(
        await invoke<unknown>("wait_msa_login"),
      );
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
      return normalizeMinecraftAccount(
        await invoke<unknown>("get_active_account"),
      );
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
      return normalizeAccountList(await invoke<unknown>("get_accounts"));
    } catch (error) {
      console.error("Failed to get accounts:", error);
      throw error;
    }
  }

  static async loginPixelAccount(username: string, password: string): Promise<MinecraftAccount> {
    const created = normalizeMinecraftAccount(
      await invoke<unknown>("login_pixel_account", { username, password }),
    );
    if (!created?.id) {
      throw new Error("La API no devolvió la cuenta Pixel");
    }
    return created;
  }

  static async lookupPixelAccount(username: string): Promise<PixelLookup> {
    const raw = await invoke<Record<string, unknown>>("lookup_pixel_account", { username });
    return {
      exists: Boolean(raw?.exists),
      username: typeof raw?.username === "string" && raw.username.trim() ? raw.username : username,
      kind: typeof raw?.kind === "string" ? raw.kind : undefined,
      rank: typeof raw?.rank === "string" ? raw.rank : undefined,
    };
  }

  static async reservePixelAccount(username: string, password: string): Promise<MinecraftAccount> {
    const created = normalizeMinecraftAccount(
      await invoke<unknown>("reserve_pixel_account", { username, password }),
    );
    if (!created?.id) {
      throw new Error("La API no devolvió la cuenta Pixel");
    }
    return created;
  }

  static async createOfflineAccount(username: string): Promise<MinecraftAccount> {
    try {
      const created = normalizeMinecraftAccount(
        await invoke<unknown>("create_offline_account", { username }),
      );
      if (!created?.id) {
        throw new Error("El backend no devolvió la cuenta offline creada");
      }
      return created;
    } catch (error) {
      console.error("Failed to create offline account:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("plugin not found") ||
        msg.toLowerCase().includes("command not found")
      ) {
        const id = uuidv4();
        try {
          const created = normalizeMinecraftAccount(
            await invoke<unknown>("create_offline_account_with_id", {
              id,
              username,
            }),
          );
          if (!created?.id) {
            throw error;
          }
          return created;
        } catch (err2) {
          console.error("Fallback create_offline_account_with_id failed:", err2);
          throw error;
        }
      }

      throw error;
    }
  }
}
