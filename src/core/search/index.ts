/**
 * Contrato de búsqueda. La implementación real vive en
 * src/database/repositories/search.ts (SQLite FTS5 + fallback LIKE en JS);
 * cualquier otro backend debe cumplir esta forma.
 */

export type SearchResultType = "record";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  /** Id del registro (igual a id). */
  recordId: string;
  formId: string;
  sectionId: string;
  /** Nombre de la sección (para agrupar resultados). */
  sectionName: string;
  /** Nombre del campo donde se encontró la coincidencia. */
  fieldName: string;
  /** Tipo del campo donde se encontró la coincidencia. */
  fieldType: string;
  /** Título legible del resultado (p. ej. primer campo textual del registro). */
  title: string;
  snippet: string | null;
  score: number;
  /**
   * true si el resultado proviene de una fase donde TODOS los términos de la
   * consulta coincidieron; false si solo es una coincidencia parcial o cercana.
   */
  exact: boolean;
}

export interface SearchOptions {
  limit?: number;
  /** Refina por sección viva. */
  sectionId?: string;
  /** Refina por formulario (dependiente de la sección). */
  formId?: string;
  /** Refina por tipos de campo (ej. ["text", "url", "email"]). */
  fieldTypes?: readonly string[];
}

export interface SearchOutcome {
  results: SearchResult[];
  /**
   * false ⇒ ningún resultado contiene todos los términos: lo que se muestra
   * son «resultados cercanos» y la UI debe indicarlo con un hint.
   */
  exact: boolean;
}

export interface SearchRepository {
  search(query: string, options?: SearchOptions): Promise<SearchOutcome>;
}

export {
  escapeRegExp,
  normalizeText,
  tokenizeQuery,
} from "./normalize";
