# GDR — Gestor de Datos de Registros

**GDR** es una aplicación de escritorio para organizar datos personales, construida
con **Tauri 2**, **React** y **SQLite**. Es un motor flexible: el usuario define sus
propias secciones, plantillas de formularios y campos, y organiza registros con
ellos. Nada está hardcodeado: la estructura la decide el usuario en tiempo de
ejecución desde la propia interfaz.

- **Autor:** EDAKZIN
- **Licencia:** [MIT](../LICENSE)

## Características

- **Secciones jerárquicas o planas:** cada sección puede ser un contenedor con
  subsecciones o una lista directa de registros.
- **Plantillas de formularios con 14 tipos de campo:** texto, texto largo, número,
  booleano, fecha, fecha y hora, URL, correo electrónico, contraseña, selección,
  selección múltiple, etiquetas, ruta de archivo e imagen.
- **Registros con dos vistas:** tabla densa para revisar muchos registros a la vez
  y ficha de detalle para verlos en profundidad.
- **Búsqueda global predictiva (Ctrl+K)** con filtros por tipo de campo,
  basada en FTS5 (búsqueda de texto completo). Nunca indexa contraseñas.
- **Papeleras con restauración:** borrado suave (soft delete) por nivel —
  secciones, formularios, campos y registros — con posibilidad de restaurar.
- **Reordenación por arrastre (drag & drop) manteniendo presionado** sobre el
  grip del elemento.
- **Temas oscuro y claro**, aplicados al instante desde Ajustes.
- **Idiomas español e inglés**, seleccionables en Ajustes.
- **Iconos personalizados por sección:** nombres de iconos Lucide o imágenes por URL.

## Instalación (usuarios)

1. Descarga el instalador desde la página de
   [GitHub Releases](https://github.com/EDAKZIN/GDR/releases):
   - `x64`: instalador NSIS de 64 bits (recomendado).
   - `x86`: instalador de 32 bits, para sistemas Windows de 32 bits.
2. Ejecuta el instalador. Se instala solo para tu usuario (`currentUser`),
   sin necesidad de permisos de administrador.

### Desinstalación

Al desinstalar, el desinstalador **pregunta si deseas conservar tus datos**:

- Si respondes «Sí», tus datos se mantienen en
  `%APPDATA%\com.edakzin.gdr` y estarán disponibles si reinstalas más adelante.
- Si respondes «No», se elimina la carpeta completa de datos.

Los datos de la aplicación (base de datos SQLite `gdr.db`) viven siempre en
`%APPDATA%\com.edakzin.gdr`, separados del ejecutable.

## Desarrollo

### Requisitos

- [Node.js](https://nodejs.org/) (LTS recomendado)
- [Rust](https://www.rust-lang.org/tools/install) (toolchain estable)
- Windows 10/11 (para construir el instalador NSIS)

### Ejecutar en modo desarrollo

```bash
npm install
npm run tauri dev
```

La base de datos SQLite (`gdr.db`) se crea automáticamente al arrancar la app,
aplicando las migraciones SQL versionadas de `src/database/migrations/`.

### Construir instaladores

```bash
npm run build:installer        # instalador x64 (tauri build)
npm run build:installer:x86    # instalador x86 (target i686-pc-windows-msvc)
npm run build:installer:all    # ambos instaladores
```

Otros comandos útiles:

```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run migrate   # valida las migraciones SQL del proyecto
cargo check       # verificación del backend Rust (en src-tauri/)
```

## Arquitectura

Arquitectura en capas, sin librerías innecesarias:

```
UI (React) → stores (Zustand) → repositorios → SQLite / FTS5
```

- `src/core/` — dominio puro: modelos Zod, tipos y registro de tipos de campo.
- `src/database/` — cliente SQLite (vía `plugin-sql`), migraciones SQL versionadas
  y repositorios que también mantienen el índice FTS5 al día.
- `src/stores/` — estado global con Zustand (secciones, registros, UI).
- `src/ui/` — componentes React organizados por módulo (secciones, formularios,
  registros, búsqueda, ajustes…).
- `src/i18n/` — internacionalización propia, mínima y sin dependencias externas:
  español es la fuente de verdad de las claves e inglés debe tener exactamente
  las mismas (garantizado por tipado con TypeScript).
- `src/theme.ts` — tema global (oscuro/claro) persistido en `localStorage`,
  aplicado como `data-theme` antes del primer render.
- `src-tauri/` — backend Tauri/Rust y configuración del bundle NSIS
  (incluye hooks del instalador/desinstalador en `windows/installer-hooks.nsh`).

Stack adicional: React 19, TypeScript, Tailwind CSS v4, Zod (validación),
Drizzle ORM (definición de esquema), FTS5 (búsqueda de texto completo) e
iconos Lucide.

## Licencia

[MIT](../LICENSE) © EDAKZIN
