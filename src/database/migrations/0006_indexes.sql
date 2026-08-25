-- GDR: índices compuestos para los filtros reales y limpieza de redundantes
--
-- Todos los listados filtran por deleted_at IS NULL (+ enabled) además de la
-- clave jerárquica; los índices de una sola columna de 0001/0003 quedan cortos.
-- Se crean los compuestos y se eliminan los de una columna que quedan
-- redundantes porque su columna inicial es el prefijo del nuevo índice.
--
-- Idempotente: CREATE/DROP INDEX IF NOT EXISTS en ambos casos.
--
-- NOTA field_values: UNIQUE (record_id, field_id) de 0001 ya crea un índice
-- automático con record_id como prefijo, así que idx_field_values_record era
-- redundante. idx_field_values_field se conserva (lo usan syncField/deindex
-- en src/database/repositories/search.ts y el CASCADE por field_id).

CREATE INDEX IF NOT EXISTS idx_sections_parent_deleted ON sections(parent_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_forms_section_deleted ON forms(section_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_fields_form_deleted ON fields(form_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_form_deleted ON records(form_id, deleted_at);

DROP INDEX IF EXISTS idx_sections_parent;
DROP INDEX IF EXISTS idx_forms_section;
DROP INDEX IF EXISTS idx_fields_form;
DROP INDEX IF EXISTS idx_records_form;
DROP INDEX IF EXISTS idx_field_values_record;
