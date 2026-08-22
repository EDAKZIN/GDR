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

/** Cláusula WHERE estándar para listados según filtros de enabled/deleted. */
export function listWhere(options: ListOptions = {}): string {
  const clauses: string[] = [];
  if (options.includeDeleted !== true) {
    clauses.push("deleted_at IS NULL");
  }
  if (options.includeDisabled !== true) {
    clauses.push("enabled = 1");
  }
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
