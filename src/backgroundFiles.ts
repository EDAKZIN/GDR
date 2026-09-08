import { getBackground, getTheme, setBackground, setTheme } from "./theme";

const BACKGROUND_PATH_KEY = "gdr.backgroundPath";
const BACKGROUND_DIR = "backgrounds";
const BACKGROUND_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"]);

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

function isBackgroundFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    return false;
  }
  return BACKGROUND_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

function isFileDisplay(value: string): boolean {
  return value.startsWith("asset://") || value.includes("asset.localhost");
}

function baseName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

/**
 * Reconcilia el fondo con la carpeta backgrounds de appdata al arrancar.
 * La ruta del fondo vive en localStorage y puede perderse (perfil nuevo,
 * dev vs release), mientras el archivo sigue en disco: en ese caso se
 * adopta la imagen más reciente y se podan las demás para que no queden
 * flotando. Si la ruta guardada sigue válida no toca nada salvo podar
 * huérfanos y reparar el display si falta. Nunca lanza.
 */
export async function restoreBackgroundFromDisk(): Promise<void> {
  const storedPath = getBackgroundFsPath();
  try {
    const { appDataDir, join } = await import("@tauri-apps/api/path");
    const { exists, readDir, remove } = await import("@tauri-apps/plugin-fs");
    const dir = await join(await appDataDir(), BACKGROUND_DIR);
    let names: string[];
    try {
      names = (await readDir(dir))
        .filter((entry) => entry.isFile && isBackgroundFile(entry.name))
        .map((entry) => entry.name)
        .sort()
        .reverse();
    } catch {
      return;
    }
    async function prune(keep: string | null): Promise<void> {
      for (const name of names) {
        if (name === keep) {
          continue;
        }
        try {
          await remove(await join(dir, name));
        } catch {
          // Un huérfano que no se puede borrar no bloquea el arranque.
        }
      }
    }
    if (storedPath !== null) {
      let storedOk = false;
      try {
        storedOk = await exists(storedPath);
      } catch {
        storedOk = false;
      }
      if (storedOk) {
        if (getBackground() === "") {
          const { convertFileSrc } = await import("@tauri-apps/api/core");
          setBackground(convertFileSrc(storedPath));
        }
        await prune(baseName(storedPath));
        return;
      }
    }
    const display = getBackground();
    if (display !== "" && !isFileDisplay(display)) {
      return;
    }
    if (names.length === 0) {
      if (storedPath !== null) {
        await replaceBackground("", null);
      }
      return;
    }
    const dest = await join(dir, names[0]);
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    await replaceBackground(convertFileSrc(dest), dest);
    if (getTheme() !== "custom") {
      setTheme("custom");
    }
    await prune(names[0]);
  } catch {
    // Sin acceso al disco o al bridge: la app arranca con el fondo que haya.
  }
}
