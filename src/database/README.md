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
