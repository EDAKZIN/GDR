-- GDR: reparación del índice de búsqueda global
--
-- CAUSA DEL BUG «el buscador nunca encuentra nada»: fts_values solo indexa
-- valores de campos con searchable = 1, pero TODOS los caminos de creación de
-- campos (plantillas en FormModal y alta manual en FieldModal) los creaban con
-- searchable = 0 por defecto. Resultado: índice vacío y cero resultados.
--
-- Reparación idempotente: marcar como buscables todos los campos vivos cuyo
-- tipo sea indexable (las contraseñas siguen excluidas por diseño; ver
-- NON_INDEXABLE_TYPES en src/database/repositories/search.ts). El usuario puede
-- desmarcar campos concretos después desde la pestaña Plantilla; reindexAll()
-- al arrancar reconstruye fts_values con el estado resultante.

UPDATE fields SET searchable = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE deleted_at IS NULL AND type <> 'password' AND searchable = 0;
