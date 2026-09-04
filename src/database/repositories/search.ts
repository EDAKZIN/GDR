/**
 * Repositorio de búsqueda transversal sobre el índice FTS5 (fts_values).
 *
 * El índice se gestiona DESDE CÓDIGO (sin triggers) porque solo deben
 * indexarse valores cuyo campo cumpla searchable = 1, enabled = 1,
 * deleted_at IS NULL y type <> 'password' (doble seguridad para contraseñas),
 * dentro de registros no eliminados. Ver la decisión documentada en
 * src/database/migrations/0002_fts.sql.
 *
 * ESTRATEGIA DE MATCHING (tolerante, tipo tienda online):
 *   1. El contenido indexado está normalizado (minúsculas, sin acentos) con
 *      normalizeText(); los términos consultados se normalizan igual.
 *   2. Fases en orden, deteniéndose al encontrar resultados:
 *      a) MATCH FTS5 con prefijo por token combinado con AND (exacto).
 *      b) MATCH con OR suave (coincidencia parcial por términos).
 *      c) LIKE '%token%' AND sobre el mismo índice (substring).
 *      d) LIKE OR (cualquier término).
 *      e) LIKE con tokens recortados («resultados cercanos» para typos).
 *   3. Ranking: bm25 de FTS5 + bonificación JS (palabra exacta > prefijo de
 *      palabra > substring); los completos (exact=true) van primero.
 *   4. El snippet se construye en JS sobre el texto ORIGINAL (no el contenido
 *      normalizado) resaltando los tramos que coinciden, así el usuario ve
 *      tildes y mayúsculas reales.
 */
import type {
  SearchOptions,
  SearchOutcome,
  SearchResult,
} from "../../core/search";
import {
  escapeRegExp,
  normalizeText,
  tokenizeQuery,
} from "../../core/search";
import { deserializeFieldValue } from "../../core/fields/values";
import type Database from "@tauri-apps/plugin-sql";
import { z } from "zod";
import type { DbHandle } from "./shared";

/** Tipos de campo cuyo valor NUNCA se indexa aunque searchable = true. */
const NON_INDEXABLE_TYPES = new Set<string>(["password"]);

/** Tipos aceptables como título legible del resultado. */
const TITLE_TYPES_SQL = "('text', 'long_text', 'url', 'email')";

interface IndexedValueRow {
  recordId: string;
  fieldId: string;
  value: string | null;
}

interface IndexableSourceRow extends IndexedValueRow {
  type: string;
}

interface MatchRow {
  recordId: string;
  fieldId: string;
  formId: string;
  sectionId: string;
  sectionName: string;
  fieldName: string;
  fieldType: string;
  rawValue: string | null;
  score: number | null;
}

interface TitleRow {
  recordId: string;
  value: string | null;
}

/**
 * Convierte el valor deserializado de un campo en texto plano indexable.
 * Devuelve null cuando no hay texto aprovechable (vacío, booleanos, objetos).
 */
function expandIsoDate(text: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (dateMatch === null) {
    return text;
  }
  const [, year, month, day] = dateMatch;
  const timeMatch = /T(\d{2}):(\d{2})/.exec(text);
  const time = timeMatch === null ? "" : ` ${timeMatch[1]}:${timeMatch[2]}`;
  const variants = [
    text,
    text.replace(/-/g, "/").replace("T", " "),
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${day}/${month}/${year}${time}`,
  ];
  return `${variants.join(" ")} ${year} ${month} ${day}`;
}

export function valueToIndexedText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    return expandIsoDate(trimmed);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "si true 1" : "no false 0";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") {
          return expandIsoDate(item.trim());
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

/** ¿Aparece `token` como palabra completa dentro del texto normalizado? */
function hasWholeWord(normalizedText: string, token: string): boolean {
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(token)}(?![\\p{L}\\p{N}])`,
    "u",
  );
  return pattern.test(normalizedText);
}

/** ¿Algún token es prefijo del inicio de una palabra del texto? */
function hasWordPrefix(normalizedText: string, token: string): boolean {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(token)}`, "u");
  return pattern.test(normalizedText);
}

/**
 * Construye el snippet resaltado (marcado con «») sobre el texto ORIGINAL:
 * localiza cada token sobre la versión normalizada pero corta el original,
 * preservando tildes y mayúsculas reales.
 */
export function buildHighlightedSnippet(
  original: string,
  tokens: readonly string[],
  maxLen = 160,
): string | null {
  const normalized = normalizeText(original);
  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    let index = normalized.indexOf(token);
    while (index !== -1) {
      ranges.push([index, index + token.length]);
      index = normalized.indexOf(token, index + Math.max(1, token.length));
    }
  }
  if (ranges.length === 0) {
    return null;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  // Fusionar rangos solapados o adyacentes.
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last: [number, number] | undefined =
      merged.length > 0 ? merged[merged.length - 1] : undefined;
    if (last !== undefined && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }

  const start = Math.max(0, merged[0][0] - 24);
  const end = Math.min(original.length, start + maxLen);
  let out = "";
  let cursor = start;
  for (const [from, to] of merged) {
    if (to <= start || from >= end) {
      continue;
    }
    const markFrom = Math.max(from, start);
    const markTo = Math.min(to, end);
    out += `${original.slice(cursor, markFrom)}«${original.slice(markFrom, markTo)}»`;
    cursor = markTo;
  }
  out += original.slice(cursor, end);
  return `${start > 0 ? "…" : ""}${out}${end < original.length ? "…" : ""}`;
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
  /**
   * Purga del índice los registros del subárbol de una sección (enabled=false)
   * o reindexa sus registros vivos (enabled=true). La llaman disable/enable
   * del repositorio de secciones.
   */
  setSectionIndexEnabled(sectionId: string, enabled: boolean): Promise<void>;
  /** Búsqueda global tolerante con filtros y marcador de exactitud. */
  search(query: string, options?: SearchOptions): Promise<SearchOutcome>;
}

const DEFAULT_SEARCH_LIMIT = 50;

type MatchPhase = "fts-and" | "fts-or" | "like-and" | "like-or" | "like-trimmed";

const COMPLETE_PHASES: ReadonlySet<MatchPhase> = new Set(["fts-and", "like-and"]);

/** Recorta tokens largos para la fase «cercanos» (typos al final del término). */
function trimTokens(tokens: readonly string[]): string[] {
  return tokens.map((token) =>
    token.length > 4
      ? token.slice(0, Math.max(3, Math.ceil(token.length * 0.7)))
      : token,
  );
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/gu, (char) => `\\${char}`);
}

export function createSearchRepository(db: DbHandle): SearchRepositoryFull {
  interface SectionFlagRow {
    id: string;
    parentId: string | null;
    enabled: number;
    deletedAt: string | null;
  }

  /**
   * Secciones cuyo contenido NO debe estar en el índice ni en resultados:
   * las que tienen la cadena COMPLETA de ancestros (incluida ella misma)
   * habilitada y viva quedan fuera de este conjunto. Decisión documentada:
   * se valida toda la cadena, no solo la sección directa, para que
   * deshabilitar un nodo oculte también a todo su subárbol.
   */
  async function loadBlockedSectionIds(database: Database): Promise<Set<string>> {
    const rows = await database.select<SectionFlagRow[]>(
      "SELECT id, parent_id AS parentId, enabled, deleted_at AS deletedAt FROM sections",
    );
    const childrenByParent = new Map<string | null, SectionFlagRow[]>();
    const blockedRoots: SectionFlagRow[] = [];
    for (const row of rows) {
      if (row.enabled === 0 || row.deletedAt !== null) {
        blockedRoots.push(row);
      }
      const key = row.parentId ?? null;
      const bucket = childrenByParent.get(key);
      if (bucket !== undefined) {
        bucket.push(row);
      } else {
        childrenByParent.set(key, [row]);
      }
    }
    const blocked = new Set<string>();
    const stack = [...blockedRoots];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || blocked.has(current.id)) {
        continue;
      }
      blocked.add(current.id);
      for (const child of childrenByParent.get(current.id) ?? []) {
        stack.push(child);
      }
    }
    return blocked;
  }

  /** Exclusión `NOT IN (…)` para secciones bloqueadas, con parámetros. */
  function buildBlockedClause(
    blocked: ReadonlySet<string>,
    paramOffset: number,
    column: "s.id" | "fo.section_id",
  ): {
    sql: string;
    params: unknown[];
  } {
    if (blocked.size === 0) {
      return { sql: "", params: [] };
    }
    const ids = [...blocked];
    const placeholders = ids
      .map((_id, index) => `$${String(paramOffset + index + 1)}`)
      .join(", ");
    return { sql: `${column} NOT IN (${placeholders})`, params: ids };
  }

  /** Ids de la sección y de TODO su subárbol (BFS con dedupe). */
  async function collectSubtreeIds(
    database: Database,
    rootId: string,
  ): Promise<string[]> {
    const ids: string[] = [rootId];
    const visited = new Set<string>([rootId]);
    let frontier = [rootId];
    while (frontier.length > 0) {
      const placeholders = frontier.map((_, index) => `$${String(index + 1)}`).join(", ");
      const rows = await database.select<Array<{ id: string }>>(
        `SELECT id FROM sections WHERE parent_id IN (${placeholders})`,
        frontier,
      );
      frontier = rows.map((row) => row.id).filter((id) => !visited.has(id));
      for (const id of frontier) {
        visited.add(id);
      }
      ids.push(...frontier);
    }
    return ids;
  }

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
      // El contenido se guarda NORMALIZADO: minúsculas y sin acentos.
      await database.execute(
        "INSERT INTO fts_values (content, record_id, field_id) VALUES ($1, $2, $3)",
        [normalizeText(text), row.recordId, row.fieldId],
      );
    }
  }

  /** Reconstruye las entradas del índice de un registro desde cero. */
  async function reindexRecord(database: Database, recordId: string): Promise<void> {
    await database.execute("DELETE FROM fts_values WHERE record_id = $1", [
      recordId,
    ]);
    const rows = await loadIndexableRows(database, { recordId });
    await insertEntries(database, rows);
  }

  /** Valores indexables de un registro/campo según las reglas del índice. */
  async function loadIndexableRows(
    database: Database,
    filter: { recordId?: string; fieldId?: string },
  ): Promise<IndexableSourceRow[]> {    const clauses: string[] = [
      "fl.searchable = 1",
      "fl.enabled = 1",
      "fl.deleted_at IS NULL",
      "r.deleted_at IS NULL",
      // Mismo criterio de visibilidad que aplican los JOIN de search():
      // nada de formularios o secciones en papelera dentro del índice.
      "fo.deleted_at IS NULL",
      "s.deleted_at IS NULL",
      "fl.type <> 'password'",
    ];
    const params: unknown[] = [];
    // Toda la cadena de ancestros (sección directa incluida) debe estar
    // habilitada y viva para que el contenido entre al índice.
    const blocked = await loadBlockedSectionIds(database);
    const blockedClause = buildBlockedClause(blocked, params.length, "s.id");
    if (blockedClause.sql !== "") {
      clauses.push(blockedClause.sql);
      params.push(...blockedClause.params);
    }
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
       JOIN forms fo ON fo.id = r.form_id
       JOIN sections s ON s.id = fo.section_id
       WHERE ${clauses.join(" AND ")}`,
      params,
    );
  }

  /**
   * Cláusulas de filtro (sección/formulario/tipos de campo). Los parámetros
   * continúan la numeración a partir de `offset` ($offset+1, …).
   */
  function buildFilterClauses(
    options: SearchOptions,
    offset: number,
  ): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let next = offset;
    if (options.formId !== undefined) {
      next += 1;
      clauses.push(`r.form_id = $${String(next)}`);
      params.push(z.uuid().parse(options.formId));
    }
    if (options.sectionId !== undefined) {
      next += 1;
      clauses.push(`fo.section_id = $${String(next)}`);
      params.push(z.uuid().parse(options.sectionId));
    }
    const fieldTypes = options.fieldTypes?.filter((type) => type !== "");
    if (fieldTypes !== undefined && fieldTypes.length > 0) {
      const placeholders: string[] = [];
      for (const _type of fieldTypes) {
        next += 1;
        placeholders.push(`$${String(next)}`);
        params.push(_type);
      }
      clauses.push(`fl.type IN (${placeholders.join(", ")})`);
    }
    return { sql: clauses.join(" AND "), params };
  }

  /** Ejecuta una fase de matching y devuelve filas crudas ordenadas. */
  async function runPhase(
    database: Database,
    phase: MatchPhase,
    tokens: readonly string[],
    options: SearchOptions,
    limit: number,
  ): Promise<MatchRow[]> {
    const isFts = phase === "fts-and" || phase === "fts-or";
    const headParams: unknown[] = [];
    const predicates: string[] = [];
    if (isFts) {
      const joiner = phase === "fts-and" ? " AND " : " OR ";
      headParams.push(tokens.map((token) => `"${token}"*`).join(joiner));
      predicates.push("fts_values MATCH $1");
    } else {
      const joiner = phase === "like-or" ? " OR " : " AND ";
      const likeClauses = tokens.map((token, index) => {
        const paramIndex = index + 1;
        headParams.push(`%${escapeLike(token)}%`);
        return `fts_values.content LIKE $${String(paramIndex)} ESCAPE '\\'`;
      });
      predicates.push(`(${likeClauses.join(joiner)})`);
    }

    const filters = buildFilterClauses(options, headParams.length);
    const allParams = [...headParams, ...filters.params];
    const whereParts = [...predicates];
    if (filters.sql !== "") {
      whereParts.push(filters.sql);
    }
    // Resultados de secciones deshabilitadas (o con ancestro deshabilitado)
    // nunca aparecen, aunque queden entradas residuales en el índice.
    const blocked = await loadBlockedSectionIds(database);
    const blockedClause = buildBlockedClause(blocked, allParams.length, "fo.section_id");
    if (blockedClause.sql !== "") {
      whereParts.push(blockedClause.sql);
      allParams.push(...blockedClause.params);
    }
    const limitParam = `$${String(allParams.length + 1)}`;
    allParams.push(limit);

    const where = whereParts.join(" AND ");

    // bm25() solo es válido en fases con MATCH; en LIKE el ranking es JS.
    const scoreSelect = isFts ? "-bm25(fts_values)" : "NULL";
    const orderBy = isFts ? "score DESC" : "rowid DESC";

    return database.select<MatchRow[]>(
      `SELECT
         fts_values.record_id AS recordId,
         fts_values.field_id AS fieldId,
         r.form_id AS formId,
         fo.section_id AS sectionId,
         s.name AS sectionName,
         fl.name AS fieldName,
         fl.type AS fieldType,
         fv.value AS rawValue,
         ${scoreSelect} AS score
       FROM fts_values
       JOIN records r ON r.id = fts_values.record_id AND r.deleted_at IS NULL
       JOIN forms fo ON fo.id = r.form_id AND fo.deleted_at IS NULL
       JOIN fields fl ON fl.id = fts_values.field_id
         AND fl.enabled = 1 AND fl.deleted_at IS NULL AND fl.type <> 'password'
       JOIN sections s ON s.id = fo.section_id AND s.deleted_at IS NULL
       JOIN field_values fv ON fv.record_id = fts_values.record_id
         AND fv.field_id = fts_values.field_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ${limitParam}`,
      allParams,
    );
  }

  return {
    async reindexAll(): Promise<void> {
      const database = await db();
      await database.execute("DELETE FROM fts_values");
      // Solo campos habilitados + searchable, sin contraseña, de registros vivos.
      const rows = await loadIndexableRows(database, {});
      await insertEntries(database, rows);
    },

    async indexRecord(recordId): Promise<void> {
      const database = await db();
      await reindexRecord(database, z.uuid().parse(recordId));
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

    async setSectionIndexEnabled(sectionId, enabled): Promise<void> {
      const database = await db();
      const rootId = z.uuid().parse(sectionId);
      const subtreeIds = await collectSubtreeIds(database, rootId);
      if (subtreeIds.length === 0) {
        return;
      }
      const placeholders = subtreeIds
        .map((_id, index) => `$${String(index + 1)}`)
        .join(", ");
      if (!enabled) {
        await database.execute(
          `DELETE FROM fts_values WHERE record_id IN (
             SELECT r.id FROM records r JOIN forms fo ON fo.id = r.form_id
             WHERE fo.section_id IN (${placeholders})
           )`,
          subtreeIds,
        );
        return;
      }
      // Reindexar los registros vivos del subárbol; indexRecord respeta la
      // cadena completa de ancestros (si un ancestro sigue deshabilitado,
      // esas ramas no vuelven al índice).
      const rows = await database.select<Array<{ id: string }>>(
        `SELECT DISTINCT r.id FROM records r
         JOIN forms fo ON fo.id = r.form_id
         WHERE fo.section_id IN (${placeholders}) AND r.deleted_at IS NULL`,
        subtreeIds,
      );
      for (const row of rows) {
        await reindexRecord(database, row.id);
      }
    },

    async search(
      query,
      options = {},
    ): Promise<SearchOutcome> {
      const tokens = tokenizeQuery(normalizeText(query));
      if (tokens.length === 0) {
        return { results: [], exact: false };
      }
      const limit = Math.max(1, Math.trunc(options.limit ?? DEFAULT_SEARCH_LIMIT));

      const nearTokens = trimTokens(tokens);
      const phases: Array<{ phase: MatchPhase; tokens: readonly string[] }> = [
        { phase: "fts-and", tokens },
        { phase: "fts-or", tokens },
        { phase: "like-and", tokens },
        { phase: "like-or", tokens },
        // Última oportunidad: prefijos recortados (typos tipo «webosx»→«webos»).
        ...(nearTokens.join(" ") === tokens.join(" ")
          ? []
          : [{ phase: "like-trimmed" as const, tokens: nearTokens }]),
      ];

      interface Collected {
        row: MatchRow;
        complete: boolean;
        priority: number;
      }
      const collected = new Map<string, Collected>();
      const database = await db();

      for (const [index, step] of phases.entries()) {
        const rows = await runPhase(database, step.phase, step.tokens, options, limit);
        for (const row of rows) {
          const key = `${row.recordId}:${row.fieldId}`;
          if (!collected.has(key)) {
            collected.set(key, {
              row,
              complete: COMPLETE_PHASES.has(step.phase),
              priority: index,
            });
          }
        }
        if (collected.size >= limit) {
          break;
        }
      }

      if (collected.size === 0) {
        return { results: [], exact: false };
      }

      // Título legible por registro: primer campo textual habilitado con valor.
      const recordIds = [...new Set([...collected.values()].map((entry) => entry.row.recordId))];
      const placeholders = recordIds.map((_id, index) => `$${String(index + 1)}`);
      const titleRows = await database.select<TitleRow[]>(
        `SELECT fv.record_id AS recordId, fv.value AS value
         FROM field_values fv
         JOIN fields fl ON fl.id = fv.field_id
           AND fl.enabled = 1 AND fl.deleted_at IS NULL
           AND fl.type IN ${TITLE_TYPES_SQL}
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

      const results: SearchResult[] = [...collected.values()]
        .map(({ row, complete }) => {
          const text = valueToIndexedText(deserializeFieldValue(row.rawValue)) ?? "";
          const normalizedText = normalizeText(text);
          const wordExact = tokens.some((token) =>
            hasWholeWord(normalizedText, token),
          );
          const wordPrefix = wordExact
            ? false
            : tokens.some((token) => hasWordPrefix(normalizedText, token));
          // Bonificación de relevancia: palabra exacta > inicio de palabra > substring.
          const boost = wordExact ? 4 : wordPrefix ? 2 : 0;
          return {
            id: row.recordId,
            type: "record" as const,
            recordId: row.recordId,
            formId: row.formId,
            sectionId: row.sectionId,
            sectionName: row.sectionName,
            fieldName: row.fieldName,
            fieldType: row.fieldType,
            title: titles.get(row.recordId) ?? "Sin título",
            snippet: buildHighlightedSnippet(text, tokens),
            score: (row.score ?? 0) + boost,
            exact: complete,
          };
        })
        .sort((a, b) => {
          if (a.exact !== b.exact) {
            return a.exact ? -1 : 1;
          }
          return b.score - a.score;
        })
        .slice(0, limit);

      return { results, exact: results.some((result) => result.exact) };
    },
  };
}
