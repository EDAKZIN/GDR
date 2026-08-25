import sql0001Init from "./0001_init.sql?raw";
import sql0002Fts from "./0002_fts.sql?raw";
import sql0003SectionHierarchy from "./0003_section_hierarchy.sql?raw";
import sql0004SectionAllowChildren from "./0004_section_allow_children.sql?raw";
import sql0005SearchableDefaults from "./0005_searchable_defaults.sql?raw";
import sql0006Indexes from "./0006_indexes.sql?raw";

export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  { id: "0001_init", sql: sql0001Init },
  { id: "0002_fts", sql: sql0002Fts },
  { id: "0003_section_hierarchy", sql: sql0003SectionHierarchy },
  { id: "0004_section_allow_children", sql: sql0004SectionAllowChildren },
  { id: "0005_searchable_defaults", sql: sql0005SearchableDefaults },
  { id: "0006_indexes", sql: sql0006Indexes },
];
