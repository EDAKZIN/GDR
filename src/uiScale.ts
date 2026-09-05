export const ZOOM_STORAGE_KEY = "gdr.zoom";

export const ZOOM_MIN = 70;
export const ZOOM_MAX = 130;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

function normalizeZoom(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    return ZOOM_DEFAULT;
  }
  const stepped = Math.round(parsed / ZOOM_STEP) * ZOOM_STEP;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, stepped));
}

function readStoredZoom(): number {
  try {
    return normalizeZoom(window.localStorage.getItem(ZOOM_STORAGE_KEY));
  } catch {
    return ZOOM_DEFAULT;
  }
}

let currentZoom: number = readStoredZoom();
const listeners = new Set<() => void>();

export function getZoom(): number {
  return currentZoom;
}

export function applyZoomToDocument(zoom: number): void {
  document.documentElement.style.setProperty("zoom", `${String(zoom)}%`);
}

export function setZoom(zoom: number): void {
  const next = normalizeZoom(zoom);
  if (next === currentZoom) {
    return;
  }
  currentZoom = next;
  try {
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(next));
  } catch {
    // Sin persistencia disponible: el zoom no sobrevive al reinicio.
  }
  applyZoomToDocument(next);
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeZoom(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyStoredZoom(): void {
  applyZoomToDocument(currentZoom);
}
