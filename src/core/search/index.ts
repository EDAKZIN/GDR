/**
 * Contrato de búsqueda. La implementación real vive en
 * src/database/repositories/search.ts (SQLite FTS5); cualquier otro backend
 * debe cumplir esta forma.
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
  /** Título legible del resultado (p. ej. primer campo textual del registro). */
  title: string;
  snippet: string | null;
  score: number;
}

export interface SearchOptions {
  limit?: number;
}

export interface SearchRepository {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
