import type Database from "@tauri-apps/plugin-sql";
import { MIGRATIONS } from "./index";

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;

export async function runMigrations(db: Database): Promise<string[]> {
  await db.execute(MIGRATIONS_TABLE_SQL);

  const rows = await db.select<Array<{ id: string }>>("SELECT id FROM _migrations");
  const appliedIds = new Set(rows.map((row) => row.id));

  const pending = MIGRATIONS.filter((migration) => !appliedIds.has(migration.id));
  const appliedNow: string[] = [];

  for (const migration of pending) {
    await db.execute(migration.sql);
    await db.execute("INSERT INTO _migrations (id) VALUES ($1)", [migration.id]);
    appliedNow.push(migration.id);
  }

  return appliedNow;
}
