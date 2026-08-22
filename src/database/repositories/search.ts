/**
 * Repositorio de búsqueda transversal sobre el índice FTS5 (fts_values).
 *
 * El índice se gestiona DESDE CÓDIGO (sin triggers) porque solo deben
 * indexarse valores cuyo campo cumpla searchable = 1, enabled = 1,
 * deleted_at IS NULL y type <> 'password' (doble seguridad para contraseñas),
 * dentro de registros no eliminados. Además el contenido indexado no es el
 * JSON crudo de field_values.value sino su representación textual limpia,
 * calculada aquí en la capa de dominio. Ver la decisión documentada en
 * src/database/migrations/0002_fts.sql.
 */
import type { SearchResult } from "../../core/search";
import { deserializeFieldValue } from "../../core/fields/values";
import type Database from "@tauri-apps/plugin-sql";
import { z } from "zod";
import type { DbHandle } from "./shared";

/** Tipos de campo cuyo valor NUNCA se indexa aunque searchable = true. */
const NON_INDEXABLE_TYPES = new Set<string>(["password"]);

interface IndexedValueRow {
  recordId: string;
  fieldId: string;
  value: string | null;
}

interface IndexableSourceRow extends IndexedValueRow {
  type: string;
}

interface SearchMatchRow {
  recordId: string;
  formId: string;
  sectionId: string;
  sectionName: string;
  fieldName: string;
  snippet: string | null;
  score: number;
}

interface TitleRow {
  recordId: string;
  value: string | null;
}

/**
 * Convierte el valor deserializado de un campo en texto plano indexable.
 * Devuelve null cuando no hay texto aprovechable (vacío, booleanos, objetos).
 */
export function valueToIndexedText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (typeof item === "number" && Number.isFinite(item)) {
          return String(item);
        }
        return "";
      })
      .filter((part) => part !== "");
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}

/**
 * Construye una expresión MATCH segura a partir de texto libre: cada token
 * se entrecomilla (anulando la sintaxis especial de FTS5) y se busca como
 * prefijo; los tokens se combinan con AND.
 */
export function buildMatchQuery(query: string): string | null {
  const tokens = query
    .split(/\s+/u)
    .map((token) => token.replace(/"/gu, "").trim())
    .filter((token) => /[\p{L}\p{N}]/u.test(token));
  if (tokens.length === 0) {
    return null;
  }
  return tokens.map((token) => `"${token}"*`).join(" AND ");
}

export interface SearchRepositoryFull {
  /** Reconstruye el índice completo (idempotente). */
  reindexAll(): Promise<void>;
  /** Sincroniza las entradas del índice de un registro (inserta/borra según su estado). */
  indexRecord(recordId: string): Promise<void>;
  /** Elimina todas las entradas del índice de un registro. */
  deindexRecord(recordId: string): Promise<void>;
  /** Recalcula las entradas del índice de un campo (cambios en searchable/enabled/deleted/type). */
  syncField(fieldId: string): Promise<void>;
  /** Búsqueda global con coincidencias y contexto. */
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

const DEFAULT_SEARCH_LIMIT = 50;

export function createSearchRepository(db: DbHandle): SearchRepositoryFull {
  async function insertEntries(
    database: Database,
    rows: readonly IndexableSourceRow[],
  ): Promise<void> {
    for (const row of rows) {
      if (NON_INDEXABLE_TYPES.has(row.type)) {
        continue;
      }
      const text = valueToIndexedText(deserializeFieldValue(row.value));
      if (text === null) {
        continue;
      }
      await database.execute(
        "INSERT INTO fts_values (content, record_id, field_id) VALUES ($1, $2, $3)",
        [text, row.recordId, row.fieldId],
      );
    }
  }

  /** Valores indexables de un registro/campo según las reglas del índice. */
  async function loadIndexableRows(
    database: Database,
    filter: { recordId?: string; fieldId?: string },
  ): Promise<IndexableSourceRow[]> {
    const clauses: string[] = [
      "fl.searchable = 1",
      "fl.enabled = 1",
      "fl.deleted_at IS NULL",
      "r.deleted_at IS NULL",
    ];
    const params: unknown[] = [];
    if (filter.recordId !== undefined) {
      params.push(z.uuid().parse(filter.recordId));
      clauses.push(`fv.record_id = $${String(params.length)}`);
    }
    if (filter.fieldId !== undefined) {
      params.push(z.uuid().parse(filter.fieldId));
      clauses.push(`fv.field_id = $${String(params.length)}`);
    }
    return database.select<IndexableSourceRow[]>(
      `SELECT fv.record_id AS recordId, fv.field_id AS fieldId, fv.value AS value, fl.type AS type
       FROM field_values fv
       JOIN fields fl ON fl.id = fv.field_id
       JOIN records r ON r.id = fv.record_id
       WHERE ${clauses.join(" AND ")}`,
      params,
    );
  }

  return {
    async reindexAll(): Promise<void> {
      const database = await db();
      await database.execute("DELETE FROM fts_values");
      // Solo campos habilitados + searchable, sin contraseña, de registros vivos.
      const rows = await database.select<IndexableSourceRow[]>(
        `SELECT fv.record_id AS recordId, fv.field_id AS fieldId, fv.value AS value, fl.type AS type
         FROM field_values fv
         JOIN fields fl ON fl.id = fv.field_id
           AND fl.searchable = 1 AND fl.enabled = 1 AND fl.deleted_at IS NULL
           AND fl.type <> 'password'
         JOIN records r ON r.id = fv.record_id AND r.deleted_at IS NULL`,
      );
      await insertEntries(database, rows);
    },

    async indexRecord(recordId): Promise<void> {
      const database = await db();
      const parsedId = z.uuid().parse(recordId);
      await database.execute("DELETE FROM fts_values WHERE record_id = $1", [
        parsedId,
      ]);
      const rows = await loadIndexableRows(database, { recordId: parsedId });
      await insertEntries(database, rows);
    },

    async deindexRecord(recordId): Promise<void> {
      const database = await db();
      await database.execute("DELETE FROM fts_values WHERE record_id = $1", [
        z.uuid().parse(recordId),
      ]);
    },

    async syncField(fieldId): Promise<void> {
      const database = await db();
      const parsedId = z.uuid().parse(fieldId);
      await database.execute("DELETE FROM fts_values WHERE field_id = $1", [
        parsedId,
      ]);
      const rows = await loadIndexableRows(database, { fieldId: parsedId });
      await insertEntries(database, rows);
    },

    async search(query, limit = DEFAULT_SEARCH_LIMIT): Promise<SearchResult[]> {
      const matchQuery = buildMatchQuery(query);
      if (matchQuery === null) {
        return [];
      }
      const database = await db();
      // La búsqueda excluye cualquier elemento eliminado de la cadena
      // registro -> formulario -> campo -> sección.
      const matches = await database.select<SearchMatchRow[]>(
        `SELECT
           fts_values.record_id AS recordId,
           r.form_id AS formId,
           fo.section_id AS sectionId,
           s.name AS sectionName,
           fl.name AS fieldName,
           snippet(fts_values, 0, '«', '»', '…', 12) AS snippet,
           -bm25(fts_values) AS score
         FROM fts_values
         JOIN records r ON r.id = fts_values.record_id AND r.deleted_at IS NULL
         JOIN forms fo ON fo.id = r.form_id AND fo.deleted_at IS NULL
         JOIN fields fl ON fl.id = fts_values.field_id
           AND fl.enabled = 1 AND fl.deleted_at IS NULL AND fl.type <> 'password'
         JOIN sections s ON s.id = fo.section_id AND s.deleted_at IS NULL
         WHERE fts_values MATCH $1
         ORDER BY score DESC
         LIMIT $2`,
        [matchQuery, Math.max(1, Math.trunc(limit))],
      );
      if (matches.length === 0) {
        return [];
      }

      // Título legible por registro: primer campo de texto habilitado con valor.
      const recordIds = [...new Set(matches.map((row) => row.recordId))];
      const placeholders = recordIds.map((_, index) => `$${String(index + 1)}`);
      const titleRows = await database.select<TitleRow[]>(
        `SELECT fv.record_id AS recordId, fv.value AS value
         FROM field_values fv
         JOIN fields fl ON fl.id = fv.field_id
           AND fl.type = 'text' AND fl.enabled = 1 AND fl.deleted_at IS NULL
         WHERE fv.record_id IN (${placeholders.join(", ")})
         ORDER BY fl.position, fl.name`,
        recordIds,
      );
      const titles = new Map<string, string>();
      for (const row of titleRows) {
        if (titles.has(row.recordId)) {
          continue;
        }
        const text = valueToIndexedText(deserializeFieldValue(row.value));
        titles.set(row.recordId, text ?? "Sin título");
      }

      return matches.map((row) => ({
        id: row.recordId,
        type: "record" as const,
        recordId: row.recordId,
        formId: row.formId,
        sectionId: row.sectionId,
        sectionName: row.sectionName,
        fieldName: row.fieldName,
        title: titles.get(row.recordId) ?? "Sin título",
        snippet: row.snippet,
        score: row.score,
      }));
    },
  };
}
