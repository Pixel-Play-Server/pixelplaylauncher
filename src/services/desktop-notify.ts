import { invoke } from "@tauri-apps/api/core";

/** Native OS notification (notify-send / toast / osascript). */
export async function desktopNotify(title: string, body: string): Promise<void> {
  try {
    await invoke("desktop_notify", { title, body });
  } catch {
    try {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") new Notification(title, { body });
        }
      }
    } catch {
      // ignore
    }
  }
}
