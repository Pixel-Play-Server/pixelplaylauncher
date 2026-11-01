import { MinecraftSkinService } from "../services/minecraft-skin-service";

const headshotCache = new Map<string, string>();

function toDataUrl(b64: string): string {
  const raw = b64.replace(/^data:image\/png;base64,/i, "").trim();
  return `data:image/png;base64,${raw}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("no se pudo leer la skin"));
    img.src = src;
  });
}

async function cropHeadFromSkin(skinDataUrl: string, size: number): Promise<string> {
  const img = await loadImage(skinDataUrl);
  const scale = Math.max(1, img.width / 64);
  const src = document.createElement("canvas");
  src.width = img.width;
  src.height = img.height;
  const sctx = src.getContext("2d");
  if (!sctx) throw new Error("canvas no disponible");
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("canvas no disponible");
  ctx.imageSmoothingEnabled = false;
  const sw = 8 * scale;
  ctx.drawImage(src, 8 * scale, 8 * scale, sw, sw, 0, 0, size, size);
  ctx.drawImage(src, 40 * scale, 8 * scale, sw, sw, 0, 0, size, size);
  return out.toDataURL("image/png");
}

async function fetchSkinPng(source: {
  type: string;
  details: Record<string, string>;
}): Promise<string | null> {
  try {
    const b64 = await MinecraftSkinService.getBase64FromSkinSource(source as any);
    return b64 ? toDataUrl(b64) : null;
  } catch {
    return null;
  }
}

export async function resolvePlayerHeadshot(
  playerName?: string | null,
  size = 64,
): Promise<string | null> {
  const name = playerName?.trim() || "";
  const cacheKey = `${name.toLowerCase() || "__steve__"}:${size}`;
  const cached = headshotCache.get(cacheKey);
  if (cached) return cached;

  const queries = name ? [name] : ["MHF_Steve", "Steve"];
  for (const query of queries) {
    const avatar = await fetchSkinPng({
      type: "Url",
      details: {
        url: `https://mc-heads.net/avatar/${encodeURIComponent(query)}/${size}`,
      },
    });
    if (avatar) {
      headshotCache.set(cacheKey, avatar);
      return avatar;
    }
  }

  if (name) {
    const profileSkin = await fetchSkinPng({
      type: "Profile",
      details: { query: name },
    });
    if (profileSkin) {
      try {
        const head = await cropHeadFromSkin(profileSkin, size);
        headshotCache.set(cacheKey, head);
        return head;
      } catch {
        /* fall through */
      }
    }
  }

  const steveSkin = await fetchSkinPng({
    type: "Url",
    details: { url: "https://mc-heads.net/skin/MHF_Steve" },
  });
  if (steveSkin) {
    try {
      const head = await cropHeadFromSkin(steveSkin, size);
      headshotCache.set(cacheKey, head);
      return head;
    } catch {
      return null;
    }
  }

  return null;
}
