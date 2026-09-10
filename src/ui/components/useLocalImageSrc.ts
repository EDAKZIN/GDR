import { useEffect, useRef, useState } from "react";

/** Ruta absoluta local (Windows con unidad, UNC o posix), no URL remota. */
export function isLocalPath(value: string): boolean {
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

/**
 * Resuelve el `src` para mostrar una imagen cuyo valor puede ser URL remota
 * o ruta local: primero vía asset (sin copiar nada) y, si falla por estar
 * fuera del scope, leyendo por comando Rust a un Blob temporal.
 * `failed` indica que ni el fallback pudo; al cambiar el valor se reintenta.
 */
export function useLocalImageSrc(raw: string | null): {
  src: string | null;
  failed: boolean;
  handleError: () => void;
} {
  const [directSrc, setDirectSrc] = useState<string | null>(null);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    const id = requestId.current;
    void (async () => {
      setDirectSrc(null);
      setBlobSrc(null);
      setFailedUrl(null);
      if (raw === null) {
        return;
      }
      const src = isLocalPath(raw) ? await toDirectSrc(raw) : raw;
      if (requestId.current === id) {
        setDirectSrc(src);
      }
    })();
  }, [raw]);

  // La URL de objeto vive solo mientras se muestra: se libera al cambiar o desmontar.
  useEffect(() => {
    return () => {
      if (blobSrc !== null) {
        URL.revokeObjectURL(blobSrc);
      }
    };
  }, [blobSrc]);

  async function handleError(): Promise<void> {
    if (raw === null) {
      return;
    }
    if (blobSrc !== null || failedUrl === raw || !isLocalPath(raw)) {
      setFailedUrl(raw);
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const bytes = await invoke<number[]>("read_image_bytes", { path: raw });
      setBlobSrc(URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mimeFor(raw) })));
    } catch {
      setFailedUrl(raw);
    }
  }

  const failed = raw !== null && failedUrl === raw;
  return {
    src: failed ? null : (blobSrc ?? directSrc),
    failed,
    handleError: () => {
      void handleError();
    },
  };
}
