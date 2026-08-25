# GDR — Data Records Manager

**GDR** is a desktop application for organizing personal data, built with
**Tauri 2**, **React** and **SQLite**. It is a flexible engine: the user defines
their own sections, form templates and fields, and organizes records with them.
Nothing is hardcoded: the structure is decided by the user at runtime, directly
from the interface.

- **Author:** EDAKZIN
- **License:** [MIT](../LICENSE)

## Features

- **Hierarchical or flat sections:** each section can be a container with
  subsections or a direct list of records.
- **Form templates with 14 field types:** text, long text, number, boolean,
  date, datetime, URL, email, password, select, multiselect, tags, file path
  and image.
- **Records with two views:** a dense table for reviewing many records at once,
  and a detail card for in-depth viewing.
- **Predictive global search (Ctrl+K)** with filters by field type, powered by
  FTS5 (full-text search). Passwords are never indexed.
- **Trash bins with restore:** soft delete at every level — sections, forms,
  fields and records — with the ability to restore them.
- **Drag & drop reordering by press-and-hold** on the item's grip handle.
- **Dark and light themes**, applied instantly from Settings.
- **Spanish and English languages**, selectable in Settings.
- **Custom section icons:** Lucide icon names or images by URL.

## Installation (users)

1. Download the installer from the
   [GitHub Releases](https://github.com/EDAKZIN/GDR/releases) page:
   - `x64`: 64-bit NSIS installer (recommended).
   - `x86`: 32-bit installer, for 32-bit Windows systems.
2. Run the installer. It installs only for your user (`currentUser`),
   no administrator permissions required.

### Uninstallation

When uninstalling, the uninstaller **asks whether you want to keep your data**:

- If you answer «Yes», your data is preserved in
  `%APPDATA%\com.edakzin.gdr` and will be available if you reinstall later.
- If you answer «No», the entire data folder is removed.

Application data (the SQLite database `gdr.db`) always lives in
`%APPDATA%\com.edakzin.gdr`, separate from the executable.

## Development

### Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Windows 10/11 (to build the NSIS installer)

### Run in development mode

```bash
npm install
npm run tauri dev
```

The SQLite database (`gdr.db`) is created automatically when the app starts,
by applying the versioned SQL migrations in `src/database/migrations/`.

### Build installers

```bash
npm run build:installer        # x64 installer (tauri build)
npm run build:installer:x86    # x86 installer (target i686-pc-windows-msvc)
npm run build:installer:all    # both installers
```

Other useful commands:

```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run migrate   # validates the project's SQL migrations
cargo check       # Rust backend check (in src-tauri/)
```

## Architecture

Layered architecture, without unnecessary libraries:

```
UI (React) → stores (Zustand) → repositories → SQLite / FTS5
```

- `src/core/` — pure domain: Zod models, types and the field type registry.
- `src/database/` — SQLite client (via `plugin-sql`), versioned SQL migrations
  and repositories that also keep the FTS5 index up to date.
- `src/stores/` — global state with Zustand (sections, records, UI).
- `src/ui/` — React components organized by module (sections, forms, records,
  search, settings…).
- `src/i18n/` — homegrown internationalization, minimal and dependency-free:
  Spanish is the source of truth for keys and English must have exactly the
  same ones (guaranteed by TypeScript typing).
- `src/theme.ts` — global theme (dark/light) persisted in `localStorage`,
  applied as `data-theme` before the first render.
- `src-tauri/` — Tauri/Rust backend and NSIS bundle configuration
  (includes installer/uninstaller hooks in `windows/installer-hooks.nsh`).

Additional stack: React 19, TypeScript, Tailwind CSS v4, Zod (validation),
Drizzle ORM (schema definition), FTS5 (full-text search) and Lucide icons.

## License

[MIT](../LICENSE) © EDAKZIN
