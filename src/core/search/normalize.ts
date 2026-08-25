/**
 * Normalización de texto para el índice de búsqueda global.
 *
 * El contenido indexado en fts_values se guarda YA normalizado (minúsculas y
 * sin acentos) y los términos consultados se normalizan con la MISMA función:
 * así el matching es insensible a mayúsculas y tildes sin depender de la
 * configuración del tokenizer FTS5 de la build de SQLite incluida en Tauri.
 *
 * Los snippets se construyen después en JS sobre el texto ORIGINAL
 * (sin normalizar), de modo que al usuario se le muestra el valor real.
 */

/** Minúsculas + elimina diacríticos (unaccent manual en JS vía NFD). */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "");
}

/** Divide una consulta en tokens utilizables: sin comillas y con contenido. */
export function tokenizeQuery(query: string): string[] {
  return query
    .split(/\s+/u)
    .map((token) => token.replace(/"/gu, "").trim())
    .filter((token) => /[\p{L}\p{N}]/u.test(token));
}

/** Escapa caracteres especiales de regex para construir comparadores seguros. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
