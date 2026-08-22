-- GDR: jerarquía opcional de secciones (sub-secciones)
-- parent_id NULL = sección raíz. La jerarquía es OPCIONAL por nodo.
-- ON DELETE CASCADE: el hard-delete de una sección arrastra su subárbol completo
-- (y vía forms/records/field_values también sus datos). El soft-delete y restore
-- recursivos del subárbol viven en el repositorio (src/database/repositories/sections.ts).
ALTER TABLE sections ADD COLUMN parent_id TEXT REFERENCES sections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sections_parent ON sections(parent_id);
