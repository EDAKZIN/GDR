import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Dictionary } from "./es";
import { en } from "./en";
import { es } from "./es";

export const LANG_STORAGE_KEY = "gdr.lang";

const LANGS = ["es", "en"] as const;

export type Lang = (typeof LANGS)[number];

/** Rutas «dominio.clave» (y sub-claves, en cualquier profundidad) válidas. */
export type TranslationKey = TranslationPaths<Dictionary>;

/** Parte recursiva del tipo de rutas válidas. */
type TranslationPaths<T> = {
  [K in keyof T]-?: T[K] extends string
    ? Extract<K, string>
    : `${Extract<K, string>}.${TranslationPaths<T[K]>}`;
}[keyof T];

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

function readStoredLang(): Lang {
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(raw) ? raw : "es";
  } catch {
    return "es";
  }
}

let currentLang: Lang = readStoredLang();
const listeners = new Set<() => void>();

/** Idioma activo (para código fuera de React: stores, core…). */
export function getLang(): Lang {
  return currentLang;
}

/** Cambia el idioma, persiste en localStorage y notifica a los suscriptores. */
export function setLang(lang: Lang): void {
  if (lang === currentLang) {
    return;
  }
  currentLang = lang;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Sin persistencia disponible: el idioma activo no sobrevive al reinicio.
  }
  for (const listener of listeners) {
    listener();
  }
}

/** Suscripción para useSyncExternalStore. */
export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sustituye marcadores {n} por los parámetros dados. */
function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (params === undefined) {
    return template;
  }
  return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/**
 * Traduce una ruta «dominio.clave» del diccionario del idioma activo.
 * Si la clave no existe (no debería pasar por tipado), devuelve la propia ruta.
 * Utilizable desde cualquier módulo (stores, core) sin React.
 */
export const translate: TranslateFn = (key, params) => {
  let node: unknown = currentLang === "en" ? en : es;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) {
      return key;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? interpolate(node, params) : key;
};

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Provider raíz de i18n. El idioma vive en el store de módulo y se sincroniza
 * con React vía useSyncExternalStore, así cualquier cambio re-renderiza.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, getLang);
  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: translate }),
    [lang],
  );
  return createElement(I18nContext.Provider, { value }, children);
}

/**
 * Hook principal: devuelve `t("dominio.clave", { n: … })` con las claves
 * tipadas contra el diccionario español, más el idioma activo y su setter.
 */
export function useT(): I18nValue {
  const lang = useSyncExternalStore(subscribeLang, getLang);
  const context = useContext(I18nContext);
  return useMemo(
    () => context ?? { lang, setLang, t: translate },
    [context, lang],
  );
}
