import Database from "@tauri-apps/plugin-sql";

export const DB_URL = "sqlite:gdr.db";

let instance: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  instance ??= Database.load(DB_URL);
  return instance;
}
