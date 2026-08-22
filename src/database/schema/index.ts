// Espejo en TypeScript del esquema de src/database/migrations/0001_init.sql.
// Referencia para tooling (drizzle-kit generate); la fuente de verdad en runtime
// son las migraciones SQL aplicadas por el runner.
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

export const sections = sqliteTable("sections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  position: integer("position").notNull().default(0),
  enabled: integer("enabled").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const forms = sqliteTable(
  "forms",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    enabled: integer("enabled").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("idx_forms_section").on(table.sectionId)],
);

export const fields = sqliteTable(
  "fields",
  {
    id: text("id").primaryKey(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // TEXT sin CHECK rígido: la lista válida vive en FIELD_TYPES (src/core/fields).
    type: text("type").notNull(),
    required: integer("required").notNull().default(0),
    searchable: integer("searchable").notNull().default(0),
    position: integer("position").notNull().default(0),
    enabled: integer("enabled").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("idx_fields_form").on(table.formId)],
);

export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    enabled: integer("enabled").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("idx_records_form").on(table.formId)],
);

export const fieldValues = sqliteTable(
  "field_values",
  {
    id: text("id").primaryKey(),
    recordId: text("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    fieldId: text("field_id")
      .notNull()
      .references(() => fields.id, { onDelete: "cascade" }),
    // JSON serializado del valor según el tipo de campo.
    value: text("value"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("uq_field_values_record_field").on(table.recordId, table.fieldId),
    index("idx_field_values_record").on(table.recordId),
    index("idx_field_values_field").on(table.fieldId),
  ],
);
