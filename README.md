# GDR

**GDR** es una aplicación de escritorio para organizar datos personales,
construida por **EDAKZIN** con **Tauri 2**, **React** y **SQLite**. Es un motor
flexible: el usuario define sus propias secciones jerárquicas, plantillas de
formularios y campos para organizar registros. Nada está hardcodeado: la
estructura la decide el usuario en tiempo de ejecución desde la propia interfaz.

## Características

- **Secciones jerárquicas o planas:** cada sección puede ser un contenedor con
  subsecciones o una lista directa de registros.
- **Plantillas de formularios con 14 tipos de campo:** texto, texto largo,
  número, booleano, fecha, fecha y hora, URL, correo electrónico, contraseña,
  selección, selección múltiple, etiquetas, ruta de archivo e imagen.
- **Registros con dos vistas:** tabla densa para revisar muchos registros a la
  vez y ficha de detalle para verlos en profundidad.
- **Búsqueda global predictiva (Ctrl+K):** basada en FTS5, con filtros por tipo
  de campo e historial persistente de búsquedas. Nunca indexa contraseñas.
- **Papeleras con restauración:** borrado suave (soft delete) en todos los
  niveles — secciones, formularios, campos y registros — con posibilidad de
  restaurarlos.
- **Reordenación drag & drop manteniendo presionado** sobre el grip del
  elemento, sin arrastres accidentales.
- **Temas oscuro y claro**, aplicados al instante desde Ajustes.
- **Idiomas español e inglés**, seleccionables en Ajustes.
- **Iconos personalizados por sección:** nombres de iconos Lucide o imágenes
  por URL.

## Requisitos

Para usuarios basta descargar el instalador; para desarrollar necesitas:

| Requisito | Descripción |
| --- | --- |
| [Node.js](https://nodejs.org/) | LTS recomendado |
| [Rust](https://www.rust-lang.org/tools/install) | Toolchain estable |
| Windows 10/11 | Para construir el instalador NSIS |

## Instalación (usuarios)

1. Descarga el instalador desde la página de
   [GitHub Releases](https://github.com/EDAKZIN/GDR/releases):
   - `x64`: instalador NSIS de 64 bits (recomendado).
   - `x86`: instalador de 32 bits, para sistemas Windows de 32 bits.
2. Ejecuta el instalador. Se instala solo para tu usuario (`currentUser`),
   sin necesidad de permisos de administrador.

Al desinstalar, el desinstalador **pregunta si deseas conservar tus datos**:
si respondes «Sí», se mantienen en `%APPDATA%\com.edakzin.gdr` y estarán
disponibles si reinstalas más adelante; si respondes «No», se elimina la
carpeta completa de datos.

## Desarrollo

```bash
git clone https://github.com/EDAKZIN/GDR.git
cd GDR
npm install
npm run tauri dev
```

La base de datos SQLite (`gdr.db`) se crea automáticamente al arrancar la app,
aplicando las migraciones SQL versionadas de `src/database/migrations/`.

### Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `npm run tauri dev` | Ejecuta la app en modo desarrollo |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run migrate` | Valida las migraciones SQL del proyecto |
| `cargo check` | Verificación del backend Rust (en `src-tauri/`) |

## Compilación de instaladores

```bash
npm run build:installer        # instalador x64 (tauri build)
npm run build:installer:x86    # instalador x86 (target i686-pc-windows-msvc)
npm run build:installer:all    # ambos instaladores
```

El bundle usa NSIS con modo de instalación `currentUser` e incluye hooks de
instalador/desinstalador en `src-tauri/windows/installer-hooks.nsh`.

## Estructura del proyecto

```
GDR/
├── src/
│   ├── core/                  # Dominio puro: modelos Zod, tipos y registro de tipos de campo
│   │   ├── fields/
│   │   ├── forms/
│   │   ├── modules/
│   │   ├── records/
│   │   ├── search/
│   │   ├── sections/
│   │   └── utils/
│   ├── database/              # Cliente SQLite (plugin-sql), migraciones y repositorios
│   │   ├── migrations/        # Migraciones SQL versionadas + índice FTS5
│   │   ├── repositories/
│   │   ├── schema/
│   │   └── client.ts
│   ├── i18n/                  # Internacionalización propia (es/en), ver src/i18n/README.md
│   ├── modules/               # Módulos integrados
│   ├── stores/                # Estado global con Zustand (secciones, registros, UI)
│   ├── ui/                    # Componentes React organizados por módulo
│   │   ├── components/
│   │   ├── forms/fields/      # Un componente por cada tipo de campo
│   │   ├── menu/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── search/            # Búsqueda global Ctrl+K
│   │   ├── sections/
│   │   ├── settings/
│   │   └── workspace/         # Tabla de registros, fichas y modales
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── theme.ts               # Tema oscuro/claro persistido en localStorage
├── scripts/
│   └── migrate.mjs
└── src-tauri/                 # Backend Tauri/Rust y configuración del bundle NSIS
    ├── capabilities/
    ├── icons/
    ├── src/
    └── windows/installer-hooks.nsh
```

Arquitectura en capas:

```
UI (React) → stores (Zustand) → repositorios → SQLite / FTS5
```

## Stack

| Tecnología | Uso |
| --- | --- |
| [Tauri 2](https://tauri.app/) | Framework de escritorio (Rust + web) |
| [React 19](https://react.dev/) | Interfaz de usuario |
| [TypeScript](https://www.typescriptlang.org/) | Tipado estático |
| [Tailwind CSS v4](https://tailwindcss.com/) | Estilos |
| [SQLite + FTS5](https://www.sqlite.org/fts5.html) | Persistencia y búsqueda de texto completo |
| [Drizzle ORM](https://orm.drizzle.team/) | Definición del esquema |
| [Zod](https://zod.dev/) | Validación de modelos |
| [Zustand](https://zustand.docs.pmnd.rs/) | Estado global |
| [Lucide](https://lucide.dev/) | Iconos |

## Internacionalización

La internacionalización es propia, mínima y sin dependencias externas:
español (`es`) es la fuente de verdad de las claves e inglés (`en`) debe tener
exactamente las mismas (garantizado por tipado con TypeScript). El idioma activo
se persiste en `localStorage` con la clave `gdr.lang`.

Para añadir un idioma nuevo (por ejemplo francés):

1. Crea `src/i18n/fr.ts` con `export const fr: Dictionary = { … }` traducido.
2. En `src/i18n/index.tsx`, añade `"fr"` a la tupla `LANGS` e importa el
   diccionario en la selección de `translate`.
3. Añade la entrada del selector de idioma que consuma `setLang("fr")`.

Consulta la guía completa en [`src/i18n/README.md`](src/i18n/README.md).

> Documentación también disponible en inglés:
> [`docs/README.en.md`](docs/README.en.md)

## Licencia

[MIT](LICENSE) - Creado por **EDAKZIN**
