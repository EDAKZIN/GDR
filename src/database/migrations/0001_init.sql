-- GDR: esquema inicial
-- Convención: ids TEXT (uuid estables; los nombres son mutables y nunca forman parte del id),
-- timestamps ISO-8601 en UTC generados por SQLite, soft-delete con deleted_at,
-- activación con enabled (0/1) y orden manual con position donde aplica.
--
-- NOTA sobre fields.type: NO se usa CHECK rígido para dejar el esquema flexible ante
-- tipos nuevos sin migración. La lista inicial de tipos válidos vive como constante TS
-- (FIELD_TYPES en src/core/fields) y se valida a nivel de aplicación al crear/editar.

CREATE TABLE IF NOT EXISTS _migrations (
  id         TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS forms (
  id          TEXT PRIMARY KEY,
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS fields (
  id          TEXT PRIMARY KEY,
  form_id     TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL,
  required    INTEGER NOT NULL DEFAULT 0,
  searchable  INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id         TEXT PRIMARY KEY,
  form_id    TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
);

-- El valor se guarda SIEMPRE serializado como JSON en texto (formato según el tipo
-- de campo definido en fields.type); la deserialización ocurre en la capa de dominio.
CREATE TABLE IF NOT EXISTS field_values (
  id         TEXT PRIMARY KEY,
  record_id  TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  field_id   TEXT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  value      TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (record_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_forms_section ON forms(section_id);
CREATE INDEX IF NOT EXISTS idx_fields_form ON fields(form_id);
CREATE INDEX IF NOT EXISTS idx_records_form ON records(form_id);
CREATE INDEX IF NOT EXISTS idx_field_values_record ON field_values(record_id);
CREATE INDEX IF NOT EXISTS idx_field_values_field ON field_values(field_id);
