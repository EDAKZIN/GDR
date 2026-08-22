-- GDR: índice de búsqueda global con SQLite FTS5
--
-- DECISIÓN (triggers vs gestión desde código): se usa una tabla virtual FTS5
-- normal gestionada desde código (src/database/repositories/search.ts) y NO
-- triggers sobre field_values, porque:
--   1) Solo deben indexarse valores cuyo campo cumpla searchable = 1,
--      enabled = 1, deleted_at IS NULL y type <> 'password', y además el
--      registro/formulario/sección no estén eliminados: son condiciones
--      multi-tabla que los triggers tendrían que resolver con subconsultas
--      frágiles en cada escritura.
--   2) El contenido indexado no es el texto crudo (field_values.value guarda
--      JSON serializado) sino su representación textual limpia, calculada en
--      la capa de dominio (strings, números y listas de etiquetas).
--   3) Cambiar searchable/enabled/deleted_at de un campo exige resincronizar
--      entradas ya indexadas; un trigger sobre field_values no ve esos cambios.
-- Mantenimiento: reindexAll() al arrancar (idempotente) e indexRecord/
-- deindexRecord/syncField invocados desde RecordRepository y FieldRepository.

CREATE VIRTUAL TABLE IF NOT EXISTS fts_values USING fts5(
  content,              -- texto plano indexable del valor del campo
  record_id UNINDEXED,  -- referencia lógica a records.id (sin FK: tabla virtual)
  field_id  UNINDEXED   -- referencia lógica a fields.id (sin FK: tabla virtual)
);
