/**
 * Contrato de búsqueda (solo interfaz por ahora). La implementación real con
 * FTS5 llegará después; cualquier backend debe cumplir esta forma.
 */

export type SearchResultType = "record";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  formId: string;
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
