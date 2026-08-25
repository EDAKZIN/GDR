/**
 * Tema global (oscuro/claro): store de módulo con la misma arquitectura que
 * i18n (useSyncExternalStore) y persistencia en localStorage «gdr.theme».
 * El tema se aplica como data-theme en <html>; index.css redefina las
 * utilidades zinc bajo [data-theme="light"] para construir el tema claro.
 */

export const THEME_STORAGE_KEY = "gdr.theme";

const THEMES = ["dark", "light"] as const;

export type Theme = (typeof THEMES)[number];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function readStoredTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : "dark";
  } catch {
    return "dark";
  }
}

let currentTheme: Theme = readStoredTheme();
const listeners = new Set<() => void>();

/** Tema activo (para código fuera de React). */
export function getTheme(): Theme {
  return currentTheme;
}

/** Escribe data-theme en <html> para activar el override CSS correspondiente. */
export function applyThemeToDocument(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Cambia el tema, persiste en localStorage, aplica el atributo y notifica. */
export function setTheme(theme: Theme): void {
  if (theme === currentTheme) {
    return;
  }
  currentTheme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sin persistencia disponible: el tema no sobrevive al reinicio.
  }
  applyThemeToDocument(theme);
  for (const listener of listeners) {
    listener();
  }
}

/** Suscripción para useSyncExternalStore. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Aplica el tema persistido ANTES del primer render (evita flash del tema
 * equivocado). Debe llamarse al arrancar, en main.tsx.
 */
export function applyStoredTheme(): void {
  applyThemeToDocument(currentTheme);
}
