import { useEffect, useRef, useState } from "react";
import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

/** Ruta absoluta local (Windows con unidad, UNC o posix), no URL remota. */
function isLocalPath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\") || value.startsWith("/");
}

function mimeFor(path: string): string {
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    default:
      return "image/jpeg";
  }
}

/** URL directa vía protocolo asset; fuera de Tauri devuelve la ruta tal cual. */
async function toDirectSrc(path: string): Promise<string> {
  try {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    return convertFileSrc(path);
  } catch {
    return path;
  }
}

export function ImageField({ field, value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  const url = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [directSrc, setDirectSrc] = useState<string | null>(null);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const requestId = useRef(0);

  // `brokenUrl` recuerda la última URL fallida; si la URL cambia se reintenta.
  const showPreview = url !== null && url !== brokenUrl;

  useEffect(() => {
    requestId.current += 1;
    const id = requestId.current;
    void (async () => {
      setDirectSrc(null);
      setBlobSrc(null);
      if (url === null) {
        return;
      }
      const src = isLocalPath(url) ? await toDirectSrc(url) : url;
      if (requestId.current === id) {
        setDirectSrc(src);
      }
    })();
  }, [url]);

  // La URL de objeto vive solo mientras se muestra: se libera al cambiar o desmontar.
  useEffect(() => {
    return () => {
      if (blobSrc !== null) {
        URL.revokeObjectURL(blobSrc);
      }
    };
  }, [blobSrc]);

  // Si la vía asset falla (ruta fuera del scope, p. ej. otra unidad), se lee
  // por comando Rust a memoria: sin copiar nada a disco.
  async function handleImgError(): Promise<void> {
    if (url === null) {
      return;
    }
    if (blobSrc !== null || !isLocalPath(url)) {
      setBrokenUrl(url);
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const bytes = await invoke<number[]>("read_image_bytes", { path: url });
      setBlobSrc(URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mimeFor(url) })));
    } catch {
      setBrokenUrl(url);
    }
  }

  const src = blobSrc ?? directSrc;

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
      {url !== null && showPreview && src !== null ? (
        <img
          src={src}
          alt={field.name}
          className="h-16 w-16 shrink-0 rounded-md border border-zinc-700 object-cover"
          onError={() => {
            void handleImgError();
          }}
        />
      ) : null}
    </div>
  );
}
