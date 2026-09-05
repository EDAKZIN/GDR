import { useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

/**
 * Campo de ruta de archivo o carpeta. Los botones «…» abren el diálogo nativo
 * (plugin dialog de Tauri) y vuelcan la ruta elegida en el campo, tanto si
 * está vacío como si ya tiene un valor (se reemplaza). Fuera de Tauri
 * (navegador en npm run dev) el plugin no existe: la llamada va envuelta en
 * try/catch y el campo manual sigue funcionando igual.
 */
export function FilePathField({ value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  const [picking, setPicking] = useState(false);

  async function pickPath(directory: boolean): Promise<void> {
    setPicking(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        directory,
      });
      if (typeof selected === "string" && selected !== "") {
        onChange(selected);
      }
    } catch {
      // Sin plugin (navegador) o diálogo cancelado/fallido: se mantiene el valor actual.
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        spellCheck={false}
        placeholder={t("campos.rutaPlaceholder")}
        className={`${fieldInputClass(false)} min-w-0 flex-1 font-mono text-xs`}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => {
          onChange(event.target.value === "" ? null : event.target.value);
        }}
        disabled={disabled}
      />
      <button
        type="button"
        title={t("campos.examinar")}
        aria-label={t("campos.examinar")}
        className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          void pickPath(false);
        }}
        disabled={disabled || picking}
      >
        <FolderOpen className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        title={t("campos.examinarCarpeta")}
        aria-label={t("campos.examinarCarpeta")}
        className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          void pickPath(true);
        }}
        disabled={disabled || picking}
      >
        <Folder className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
