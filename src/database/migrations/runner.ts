import type Database from "@tauri-apps/plugin-sql";
import { MIGRATIONS } from "./index";

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;

/**
 * Divide un script SQL en sentencias individuales.
 * El plugin-sql (sqlx) no admite ejecutar varias sentencias en una sola llamada,
 * por lo que cada migración debe enviarse sentencia por sentencia.
 * Ignora comentarios de línea (`--`) y respeta literales entre comillas simples.
 */
export function splitSqlStatements(script: string): string[] {
  const withoutComments = script
    .split("\n")
    .map((line) => line.replace(/(^|\s)--.*$/, "$1"))
    .join("\n");

  const statements: string[] = [];
  let current = "";
  let insideString = false;

  for (const char of withoutComments) {
    if (char === "'") {
      insideString = !insideString;
    }
    if (char === ";" && !insideString) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      continue;
    }
    current += char;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }
  return statements;
}

export async function runMigrations(db: Database): Promise<string[]> {
  await db.execute(MIGRATIONS_TABLE_SQL);

  const rows = await db.select<Array<{ id: string }>>("SELECT id FROM _migrations");
  const appliedIds = new Set(rows.map((row) => row.id));

  const pending = MIGRATIONS.filter((migration) => !appliedIds.has(migration.id));
  const appliedNow: string[] = [];

  for (const migration of pending) {
    for (const statement of splitSqlStatements(migration.sql)) {
      await db.execute(statement);
    }
    await db.execute("INSERT INTO _migrations (id) VALUES ($1)", [migration.id]);
    appliedNow.push(migration.id);
  }

  return appliedNow;
}
