export const PIXELPLAY_CAPE_CDN = "https://cdn.pixelplay.gg/capes/prod";
export const PIXELPLAY_API = "https://api.pixelplay.gg";

export function cosmeticCapeUrl(hash: string): string {
  return `${PIXELPLAY_CAPE_CDN}/${encodeURIComponent(hash)}.png`;
}

export function compactUuid(id?: string | null): string {
  return (id || "").replace(/-/g, "").toLowerCase();
}

export function accountSkinUrl(uuid?: string | null, username?: string | null): string {
  const id = compactUuid(uuid);
  if (id.length === 32) {
    return `${PIXELPLAY_API}/api/v1/player/${id}/skin.png`;
  }
  if (username) {
    return `https://mc-heads.net/skin/${encodeURIComponent(username)}`;
  }
  return "";
}

export function accountCapeUrl(uuid?: string | null): string {
  const id = compactUuid(uuid);
  if (id.length !== 32) {
    return "";
  }
  return `${PIXELPLAY_API}/api/v1/player/${id}/cape.png`;
}

export function isVanillaCapeItem(cape: { id?: string; url?: string; _id?: string }): boolean {
  return Boolean(cape && cape.id && cape.url && !cape._id);
}
