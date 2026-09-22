/**
 * Tema global (oscuro/claro/personalizado): store de módulo con la misma arquitectura que
 * i18n (useSyncExternalStore) y persistencia en localStorage «gdr.theme».
 * El tema se aplica como data-theme en <html>; index.css redefine las
 * utilidades zinc bajo [data-theme="light"] para construir el tema claro.
 * El tema personalizado parte de la base oscura y suma acento (data-accent,
 * remapea las utilidades sky en index.css) y fondo propio (gdr.background).
 * Acento y fondo solo se aplican con el tema personalizado activo; en
 * oscuro/claro la interfaz queda intacta aunque haya valores guardados.
 */

export const THEME_STORAGE_KEY = "gdr.theme";
export const ACCENT_STORAGE_KEY = "gdr.accent";
export const BACKGROUND_STORAGE_KEY = "gdr.background";

const THEMES = ["dark", "light", "custom"] as const;

export type Theme = (typeof THEMES)[number];

export const ACCENTS = [
  "sky",
  "emerald",
  "teal",
  "lime",
  "amber",
  "orange",
  "rose",
  "violet",
  "pink",
] as const;

export type Accent = (typeof ACCENTS)[number];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && (ACCENTS as readonly string[]).includes(value);
}

function readStoredTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(raw) ? raw : "dark";
  } catch {
    return "dark";
  }
}

function readStoredAccent(): Accent {
  try {
    const raw = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccent(raw) ? raw : "sky";
  } catch {
    return "sky";
  }
}

function readStoredBackground(): string {
  try {
    const raw = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);
    return typeof raw === "string" ? raw : "";
  } catch {
    return "";
  }
}

let currentTheme: Theme = readStoredTheme();
let currentAccent: Accent = readStoredAccent();
let currentBackground: string = readStoredBackground();
const themeListeners = new Set<() => void>();
const accentListeners = new Set<() => void>();
const backgroundListeners = new Set<() => void>();

/** Tema activo (para código fuera de React). */
export function getTheme(): Theme {
  return currentTheme;
}

/** Acento activo (para código fuera de React). */
export function getAccent(): Accent {
  return currentAccent;
}

/** Fondo propio activo: "" = ninguno, si no URL o src de archivo convertido. */
export function getBackground(): string {
  return currentBackground;
}

/** Escribe data-theme en <html> para activar el override CSS correspondiente. */
export function applyThemeToDocument(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function applyAccentToDocument(theme: Theme, accent: Accent): void {
  if (theme === "custom") {
    document.documentElement.dataset.accent = accent;
  } else {
    delete document.documentElement.dataset.accent;
  }
}

function applyBackgroundToDocument(theme: Theme, background: string): void {
  const root = document.documentElement;
  if (theme === "custom" && background !== "") {
    root.dataset.background = "image";
    root.style.setProperty("--gdr-bg-image", `url("${background.replace(/"/g, "%22")}")`);
  } else {
    delete root.dataset.background;
    root.style.removeProperty("--gdr-bg-image");
  }
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
  applyAccentToDocument(theme, currentAccent);
  applyBackgroundToDocument(theme, currentBackground);
  for (const listener of themeListeners) {
    listener();
  }
}

/** Cambia el acento, lo persiste y lo aplica si el tema personalizado está activo. */
export function setAccent(accent: Accent): void {
  if (accent === currentAccent) {
    return;
  }
  currentAccent = accent;
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // Sin persistencia disponible: el acento no sobrevive al reinicio.
  }
  applyAccentToDocument(currentTheme, accent);
  for (const listener of accentListeners) {
    listener();
  }
}

/** Cambia el fondo propio ("" = ninguno), lo persiste y lo aplica si corresponde. */
export function setBackground(background: string): void {
  const next = typeof background === "string" ? background.trim() : "";
  if (next === currentBackground) {
    return;
  }
  currentBackground = next;
  try {
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, next);
  } catch {
    // Sin persistencia disponible: el fondo no sobrevive al reinicio.
  }
  applyBackgroundToDocument(currentTheme, next);
  for (const listener of backgroundListeners) {
    listener();
  }
}

/** Suscripción para useSyncExternalStore. */
export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

/** Suscripción para useSyncExternalStore. */
export function subscribeAccent(listener: () => void): () => void {
  accentListeners.add(listener);
  return () => {
    accentListeners.delete(listener);
  };
}

/** Suscripción para useSyncExternalStore. */
export function subscribeBackground(listener: () => void): () => void {
  backgroundListeners.add(listener);
  return () => {
    backgroundListeners.delete(listener);
  };
}

/**
 * Aplica el tema persistido ANTES del primer render (evita flash del tema
 * equivocado). Debe llamarse al arrancar, en main.tsx.
 */
export function applyStoredTheme(): void {
  applyThemeToDocument(currentTheme);
  applyAccentToDocument(currentTheme, currentAccent);
  applyBackgroundToDocument(currentTheme, currentBackground);
}
