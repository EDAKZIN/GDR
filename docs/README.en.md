# GDR

**GDR** is a desktop application for organizing personal data, built by
**EDAKZIN** with **Tauri 2**, **React** and **SQLite**. It is a flexible
engine: the user defines their own hierarchical sections, form templates and
fields to organize records. Nothing is hardcoded: the structure is decided by
the user at runtime, directly from the interface.

## Features

- **Hierarchical or flat sections:** each section can be a container with
  subsections or a direct list of records.
- **Form templates with 14 field types:** text, long text, number, boolean,
  date, datetime, URL, email, password, select, multiselect, tags, file path
  and image.
- **Records with two views:** a dense table for reviewing many records at
  once and a detail card for in-depth viewing.
- **Predictive global search (Ctrl+K):** powered by FTS5, with filters by
  field type and a persistent search history. Passwords are never indexed.
- **Trash bins with restore:** soft delete at every level — sections, forms,
  fields and records — with the ability to restore them.
- **Drag & drop reordering by press-and-hold** on the item's grip handle, no
  accidental drags.
- **Dark and light themes**, applied instantly from Settings.
- **Spanish and English languages**, selectable in Settings.
- **Custom section icons:** Lucide icon names or images by URL.

## Requirements

Users only need to download the installer; for development you need:

| Requirement | Description |
| --- | --- |
| [Node.js](https://nodejs.org/) | LTS recommended |
| [Rust](https://www.rust-lang.org/tools/install) | Stable toolchain |
| Windows 10/11 | To build the NSIS installer |

## Installation (users)

1. Download the installer from the
   [GitHub Releases](https://github.com/EDAKZIN/GDR/releases) page:
   - `x64`: 64-bit NSIS installer (recommended).
   - `x86`: 32-bit installer, for 32-bit Windows systems.
2. Run the installer. It installs only for your user (`currentUser`), no
   administrator permissions required.

When uninstalling, the uninstaller **asks whether you want to keep your
data**: if you answer «Yes», it is preserved in `%APPDATA%\com.edakzin.gdr`
and will be available if you reinstall later; if you answer «No», the entire
data folder is removed.

## Development

```bash
git clone https://github.com/EDAKZIN/GDR.git
cd GDR
npm install
npm run tauri dev
```

The SQLite database (`gdr.db`) is created automatically when the app starts,
by applying the versioned SQL migrations in `src/database/migrations/`.

### Available commands

| Command | Description |
| --- | --- |
| `npm run tauri dev` | Run the app in development mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run migrate` | Validates the project's SQL migrations |
| `cargo check` | Rust backend check (in `src-tauri/`) |

## Building installers

```bash
npm run build:installer        # x64 installer (tauri build)
npm run build:installer:x86    # x86 installer (target i686-pc-windows-msvc)
npm run build:installer:all    # both installers
```

The bundle uses NSIS with `currentUser` install mode and includes
installer/uninstaller hooks in `src-tauri/windows/installer-hooks.nsh`.

## Project structure

```
GDR/
├── src/
│   ├── core/                  # Pure domain: Zod models, types and field type registry
│   │   ├── fields/
│   │   ├── forms/
│   │   ├── modules/
│   │   ├── records/
│   │   ├── search/
│   │   ├── sections/
│   │   └── utils/
│   ├── database/              # SQLite client (plugin-sql), migrations and repositories
│   │   ├── migrations/        # Versioned SQL migrations + FTS5 index
│   │   ├── repositories/
│   │   ├── schema/
│   │   └── client.ts
│   ├── i18n/                  # Homegrown internationalization (es/en), see src/i18n/README.md
│   ├── modules/               # Built-in modules
│   ├── stores/                # Global state with Zustand (sections, records, UI)
│   ├── ui/                    # React components organized by module
│   │   ├── components/
│   │   ├── forms/fields/      # One component per field type
│   │   ├── menu/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── search/            # Global search Ctrl+K
│   │   ├── sections/
│   │   ├── settings/
│   │   └── workspace/         # Records table, detail cards and modals
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── theme.ts               # Dark/light theme persisted in localStorage
├── scripts/
│   └── migrate.mjs
└── src-tauri/                 # Tauri/Rust backend and NSIS bundle configuration
    ├── capabilities/
    ├── icons/
    ├── src/
    └── windows/installer-hooks.nsh
```

Layered architecture:

```
UI (React) → stores (Zustand) → repositories → SQLite / FTS5
```

## Stack

| Technology | Usage |
| --- | --- |
| [Tauri 2](https://tauri.app/) | Desktop framework (Rust + web) |
| [React 19](https://react.dev/) | User interface |
| [TypeScript](https://www.typescriptlang.org/) | Static typing |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [SQLite + FTS5](https://www.sqlite.org/fts5.html) | Persistence and full-text search |
| [Drizzle ORM](https://orm.drizzle.team/) | Schema definition |
| [Zod](https://zod.dev/) | Model validation |
| [Zustand](https://zustand.docs.pmnd.rs/) | Global state |
| [Lucide](https://lucide.dev/) | Icons |

## Internationalization

Internationalization is homegrown, minimal and dependency-free: Spanish (`es`)
is the source of truth for keys and English (`en`) must have exactly the same
ones (guaranteed by TypeScript typing). The active language is persisted in
`localStorage` under the `gdr.lang` key.

To add a new language (for example French):

1. Create `src/i18n/fr.ts` with a translated
   `export const fr: Dictionary = { … }`.
2. In `src/i18n/index.tsx`, add `"fr"` to the `LANGS` tuple and import the
   dictionary into the `translate` selection.
3. Add the language selector entry that consumes `setLang("fr")`.

See the full guide at [`src/i18n/README.md`](../src/i18n/README.md)
(Spanish).

> Documentation is also available in Spanish: [`README.md`](../README.md)

## License

[MIT](../LICENSE) - Created by **EDAKZIN**
