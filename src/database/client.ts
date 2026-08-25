import Database from "@tauri-apps/plugin-sql";

export const DB_URL = "sqlite:gdr.db";

let instance: Promise<Database> | null = null;

/**
 * Abre la conexión y aplica ajustes de sesión.
 *
 * PRAGMA foreign_keys: el esquema depende de ON DELETE CASCADE (forms→sections,
 * fields/records→forms, field_values→records/fields, sections.parent_id).
 * A día de hoy el plugin ya lo activa porque sqlx (0.8.x) pone
 * `foreign_keys = true` por defecto en SqliteConnectOptions y
 * tauri-plugin-sql no lo sobreescribe; se ejecuta el PRAGMA igualmente como
 * defensa explícita frente a cambios futuros del plugin/sqlx.
 * NOTA: al ser un pool de conexiones, este PRAGMA cubre con certeza la
 * conexión usada aquí; el resto hereda el default de sqlx.
 */
async function openDb(): Promise<Database> {
  const database = await Database.load(DB_URL);
  await database.execute("PRAGMA foreign_keys = ON");
  return database;
}

export function getDb(): Promise<Database> {
  instance ??= openDb();
  return instance;
}
