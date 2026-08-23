-- GDR: control granular de jerarquía por sección.
-- allow_children = 1 (por defecto): la sección admite sub-secciones.
-- allow_children = 0: hoja estructural; crear/mover secciones bajo ella falla.
-- La validación (crear, mover vía move(), desactivar con hijas vivas)
-- vive en el repositorio (src/database/repositories/sections.ts).
ALTER TABLE sections ADD COLUMN allow_children INTEGER NOT NULL DEFAULT 1;
