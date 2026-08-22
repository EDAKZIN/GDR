import sql0001Init from "./0001_init.sql?raw";
import sql0002Fts from "./0002_fts.sql?raw";
import sql0003SectionHierarchy from "./0003_section_hierarchy.sql?raw";

export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  { id: "0001_init", sql: sql0001Init },
  { id: "0002_fts", sql: sql0002Fts },
  { id: "0003_section_hierarchy", sql: sql0003SectionHierarchy },
];
