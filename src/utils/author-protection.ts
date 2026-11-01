import type { Profile } from "../types/profile";
import type { pixelplayModpacksConfig } from "../types/pixelplayPacks";

/** Pack IDs whose mods must stay author-locked (hide list, block folder access). */
export function isAuthorProtectedPack(
  packId: string | null | undefined,
  packsConfig: pixelplayModpacksConfig | null | undefined,
): boolean {
  if (!packId || !packsConfig?.packs) return false;
  return !!packsConfig.packs[packId]?.isProtectedByAuthor;
}

export function isProfileAuthorProtected(
  profile: Pick<Profile, "selected_pixelplay_pack_id"> | null | undefined,
  packsConfig: pixelplayModpacksConfig | null | undefined,
): boolean {
  return isAuthorProtectedPack(profile?.selected_pixelplay_pack_id, packsConfig);
}

export const AUTHOR_PROTECTION_TOAST_KEY = "profiles.authorProtection.folderBlocked";
