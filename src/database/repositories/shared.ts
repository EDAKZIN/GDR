import type Database from "@tauri-apps/plugin-sql";
import { z } from "zod";

export type DbHandle = () => Promise<Database>;

/** Convierte el entero 0/1 de SQLite en boolean de dominio. */
export const dbEnabled = z
  .number()
  .int()
  .refine((value) => value === 0 || value === 1)
  .transform((value) => value === 1);

export function boolToDb(value: boolean): number {
  return value ? 1 : 0;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export interface ListOptions {
  includeDisabled?: boolean;
  includeDeleted?: boolean;
}

/** Cláusulas estándar para listados según filtros de enabled/deleted. */
export function listClauses(options: ListOptions = {}): string[] {
  const clauses: string[] = [];
  if (options.includeDeleted !== true) {
    clauses.push("deleted_at IS NULL");
  }
  if (options.includeDisabled !== true) {
    clauses.push("enabled = 1");
  }
  return clauses;
}

/** Cláusula WHERE estándar para listados según filtros de enabled/deleted. */
export function listWhere(options: ListOptions = {}): string {
  const clauses = listClauses(options);
  return clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
}

/** Acumula fragmentos `col = $n` con sus parámetros posicionales ($1, $2, ...). */
export function appendSet(
  sets: string[],
  params: unknown[],
  column: string,
  value: unknown,
): void {
  sets.push(`${column} = $${String(params.length + 1)}`);
  params.push(value);
}

/**
 * Reordenamiento ATÓMICO: fija position = índice para cada id en una sola
 * UPDATE (CASE). plugin-sql no ofrece transacciones fiables sobre el pool de
 * sqlx (BEGIN y COMMIT podrían ejecutarse en conexiones distintas), así que un
 * bucle de UPDATEs quedaría a medias si algo falla a mitad de recorrido,
 * dejando posiciones mezcladas; aquí o se aplica todo o nada.
 * `table` debe ser SIEMPRE un literal del propio código, nunca input.
 */
export async function reorderAtomically(
  database: Database,
  table: string,
  orderedIds: readonly string[],
): Promise<void> {
  if (orderedIds.length === 0) {
    return;
  }
  const caseBranches: string[] = [];
  const params: unknown[] = [];
  for (const [index, id] of orderedIds.entries()) {
    // Cada id ocupa $2n+1 y su posición $2n+2.
    params.push(id, index);
    caseBranches.push(`WHEN $${String(params.length - 1)} THEN $${String(params.length)}`);
  }
  const idPlaceholders = orderedIds.map((_, index) => `$${String(index * 2 + 1)}`);
  params.push(nowIso());
  const updatedAtParam = String(params.length);
  await database.execute(
    `UPDATE ${table} SET position = CASE id ${caseBranches.join(" ")} END, updated_at = $${updatedAtParam} WHERE id IN (${idPlaceholders.join(", ")})`,
    params,
  );
}
