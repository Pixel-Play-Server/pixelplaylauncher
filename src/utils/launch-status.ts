import type { TFunction } from "i18next";

export function formatLaunchStatus(
  t: TFunction,
  message: string | null | undefined,
  fallbackKey = "launcher.status.starting",
): string {
  if (!message) return t(fallbackKey);
  if (message.startsWith("launcher.")) {
    const translated = t(message);
    if (translated !== message) return translated;
    return t(fallbackKey);
  }
  const asEvent = `launcher.status.${message}`;
  const translated = t(asEvent);
  if (translated !== asEvent) return translated;
  return message;
}

export function isGroupMigrationNeeded(info: unknown): boolean {
  if (!info || typeof info !== "object") return false;
  const rec = info as Record<string, unknown>;
  if (rec.needed === false) return false;
  const direction = rec.direction;
  if (direction == null || direction === "" || direction === "None") {
    return false;
  }
  return (
    direction === "FromGroupToInstance" || direction === "FromInstanceToGroup"
  );
}
