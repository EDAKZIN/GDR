import { setBackground } from "./theme";

const BACKGROUND_PATH_KEY = "gdr.backgroundPath";

export function getBackgroundFsPath(): string | null {
  try {
    const raw = window.localStorage.getItem(BACKGROUND_PATH_KEY);
    return typeof raw === "string" && raw !== "" ? raw : null;
  } catch {
    return null;
  }
}

async function deleteBackgroundFile(path: string | null): Promise<void> {
  if (path === null) {
    return;
  }
  try {
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(path);
  } catch {
    // El archivo ya no existe o no se puede borrar: no bloquea el cambio.
  }
}

export async function replaceBackground(displayValue: string, fsPath: string | null): Promise<void> {
  const old = getBackgroundFsPath();
  if (old !== null && old !== fsPath) {
    await deleteBackgroundFile(old);
  }
  try {
    if (fsPath === null) {
      window.localStorage.removeItem(BACKGROUND_PATH_KEY);
    } else {
      window.localStorage.setItem(BACKGROUND_PATH_KEY, fsPath);
    }
  } catch {
    // Sin persistencia disponible: el cambio solo vive en la sesión.
  }
  setBackground(displayValue);
}
