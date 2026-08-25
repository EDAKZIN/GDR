# Base de datos (GDR)

## Acceso runtime: plugin-sql con SQL crudo

El acceso a SQLite en la app se hace exclusivamente vía `@tauri-apps/plugin-sql`
(plugin oficial de Tauri 2, feature `sqlite` en Cargo). Los repositorios en
`src/database/repositories/` ejecutan SQL crudo contra el handle de la base
(`src/database/client.ts`, base de datos `gdr.db`).

## Migraciones

- Las migraciones viven en `src/database/migrations/` como archivos `.sql`
  numerados (`0001_init.sql`, `0002_*.sql`, ...).
- El runner (`src/database/migrations/runner.ts`) se ejecuta al arrancar la app
  (ver `bootstrap()` en `src/main.tsx`): crea la tabla `_migrations` si no
  existe y aplica en orden solo las migraciones pendientes.
- `npm run migrate` valida localmente que los archivos estén bien numerados,
  sin duplicados y no vacíos (no ejecuta SQL; eso ocurre dentro de la app).

## Integridad referencial (PRAGMA foreign_keys)

El esquema depende de `ON DELETE CASCADE` (forms→sections, fields/records→forms,
field_values→records/fields, sections.parent_id). Estado verificado en la
auditoría:

- tauri-plugin-sql 2.4.0 (`wrapper.rs`) abre el pool con sqlx `Pool::connect`,
  y `SqliteConnectOptions::new()` de sqlx 0.8 activa `foreign_keys = true` por
  defecto: **las FK y las CASCADE están vivas**.
- Aun así, `client.ts` ejecuta `PRAGMA foreign_keys = ON` al abrir la conexión
  como defensa explícita frente a cambios futuros del plugin/sqlx. Ojo: al ser
  un pool, ese PRAGMA cubre con certeza solo la conexión que lo ejecuta; el
  resto depende del default de sqlx.
- Red de seguridad adicional (fuera de esta zona): `sections.hardDelete` hace
  limpieza defensiva de huérfanos en `src/database/repositories/sections.ts`.

## Migraciones

- Las migraciones viven en `src/database/migrations/` como archivos `.sql`
  numerados (`0001_init.sql`, `0002_*.sql`, ...).
- El runner (`src/database/migrations/runner.ts`) se ejecuta al arrancar la app
  (ver `bootstrap()` en `src/main.tsx`): crea la tabla `_migrations` si no
  existe y aplica en orden solo las migraciones pendientes.
- `npm run migrate` valida localmente que los archivos estén bien numerados,
  sin duplicados, no vacíos Y registrados en `index.ts` (no ejecuta SQL; eso
  ocurre dentro de la app).

### Riesgo conocido: aplicación parcial sin registrar

El plugin-sql no permite transacciones multi-sentencia desde JS, así que el
runner aplica cada migración sentencia a sentencia y registra el id DESPUÉS del
último statement. Si el proceso muere a medias, la migración queda aplicada
parcialmente SIN registrar, y el siguiente arranque reintenta desde el primer
statement. Riesgo por migración:

| Migración | Statements | Riesgo si se interrumpe |
|---|---|---|
| 0001_init | DDL idempotente (`IF NOT EXISTS`) | Ninguno: re-ejecutar es seguro. |
| 0002_fts | `CREATE VIRTUAL TABLE IF NOT EXISTS` | Ninguno. |
| 0003_section_hierarchy | `ALTER TABLE ADD COLUMN parent_id` + `CREATE INDEX IF NOT EXISTS` | MEDIO: si falla tras el ALTER (p. ej. al crear el índice), el reintento falla con «duplicate column name». Requiere arreglo manual (INSERT del id en `_migrations`). SQLite no soporta `ADD COLUMN IF NOT EXISTS`. |
| 0004_section_allow_children | `ALTER TABLE ADD COLUMN allow_children` | MEDIO: ídem 0003 (es statement único, el riesgo es morir justo antes del INSERT en `_migrations`). |
| 0005_searchable_defaults | UPDATE idempotente | Bajo: re-ejecutar solo repite el UPDATE (sin efecto). |
| 0006_indexes | `CREATE/DROP ... IF [NOT] EXISTS` | Ninguno: totalmente idempotente. |

Convención para minimizar el riesgo: statements destructivos o no-idempotentes
primero, todo lo que admita `IF NOT EXISTS` después; nuevas migraciones deben
ser idempotentes siempre que la sintaxis lo permita.

## Índices

Los listados reales filtran siempre por `deleted_at IS NULL` (+ `enabled`)
además de la clave jerárquica, así que desde `0006_indexes` existen índices
compuestos (`parent_id/section_id/form_id`, `deleted_at`). Los índices de una
sola columna de 0001/0003 se eliminaron allí por redundantes (su columna era
prefijo del compuesto), igual que `idx_field_values_record`, cubierto por el
índice automático de `UNIQUE (record_id, field_id)`.

## FTS5 (fts_values)

Tabla virtual FTS5 propia (no external-content): el contenido indexado es el
texto normalizado calculado en JS, no el JSON crudo de `field_values`, así que
external-content no aplica. `record_id`/`field_id` son UNINDEXED (FTS5 no
permite indexarlos); los borrados por record/field en `search.ts` hacen full
scan de la tabla virtual, aceptable a escala de escritorio. Si creciera, la vía
sería una tabla auxiliar regular `(record_id, field_id) -> rowid` mantenida
junto al índice.

## Drizzle

`drizzle-orm` + `drizzle-kit` están incluidos para **definir el esquema en
TypeScript** (`src/database/schema/index.ts`) y, opcionalmente, generar SQL de
referencia con `npx drizzle-kit generate`. Ese SQL generado NO se aplica
automáticamente: el esquema fuente de verdad para producción son las
migraciones manuales aplicadas por el runner. Se eligió esta vía porque
conciliar el cliente drizzle runtime con plugin-sql añade fricción sin beneficio
real aquí.

## Convenciones del esquema

- Claves primarias: `id TEXT` (UUID v4).
- Timestamps ISO-8601 UTC generados por SQLite.
- Soft delete: columna `deleted_at` (NULL = activo).
- Ordenación manual: columna `position`.
- Activación: columna `enabled` (0/1).
