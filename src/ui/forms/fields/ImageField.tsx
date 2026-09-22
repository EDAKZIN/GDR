import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { useT } from "../../../i18n";
import { useLocalImageSrc } from "../../components/useLocalImageSrc";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function ImageField({ field, value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  const url = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  const [picking, setPicking] = useState(false);
  const image = useLocalImageSrc(url);

  // El botón vuelca la ruta local elegida en el campo (sin copiarla, el
  // preview la resuelve solo). Fuera de Tauri el plugin no existe y queda
  // la edición manual de la URL.
  async function pickLocalImage(): Promise<void> {
    setPicking(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"],
          },
        ],
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

  const previewSrc = url !== null && !image.failed ? image.src : null;

  return (
    <div className="flex items-start gap-3">
      <input
        type="text"
        placeholder={t("campos.imagenPlaceholder")}
        className={fieldInputClass(false)}
        value={url ?? ""}
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
          void pickLocalImage();
        }}
        disabled={disabled || picking}
      >
        <FolderOpen className="h-4 w-4" aria-hidden />
      </button>
      {url !== null && previewSrc !== null ? (
        <img
          src={previewSrc}
          alt={field.name}
          title={url}
          className="h-16 w-16 shrink-0 rounded-md border border-zinc-700 object-cover"
          onError={image.handleError}
        />
      ) : null}
    </div>
  );
}
