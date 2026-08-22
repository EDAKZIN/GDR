import sql0001Init from "./0001_init.sql?raw";
import sql0002Fts from "./0002_fts.sql?raw";

export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  { id: "0001_init", sql: sql0001Init },
  { id: "0002_fts", sql: sql0002Fts },
];
