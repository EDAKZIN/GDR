# GDR

Hi, I'm **EDAKZIN** and this is my personal data manager. I built it because
I was tired of squeezing my information into apps that already decided how I
should organize it: here nothing is hardcoded. You create your sections, build
your form templates with whatever fields you want, and store your records.
The app just gives you the engine.

It's built with **Tauri 2**, **React 19** and **SQLite**, and it installs like
a regular desktop app on Windows.

## What you can do

- **Sections your way:** each section can be a container with up to 5
  subsections or a flat list that goes straight to records.
- **Forms with 16 field types:** text, long text, number, yes/no, date,
  datetime, phone (with real validation), email, URL, password, select,
  multiselect, tags, rating, file path and image.
- **Two views for your records:** a dense table to scan many at once and a
  detail card to read them calmly.
- **Global search with `Ctrl+F`:** really fast thanks to FTS5, forgiving when
  you type without accents, and it keeps your history. Passwords are never
  indexed, by design.
- **Trash bins with restore:** everything is soft-deleted first (sections,
  forms, fields and records). Permanent deletion only exists inside the
  trash, so you never lose anything by accident.
- **Press-and-hold to reorder:** ~350 ms on the item, then drag it. No more
  accidental reordering.
- **Three themes:** dark, light and custom (with your own accent color and
  background image, from file or URL). Plus UI zoom from 70% to 130% with
  `Ctrl +` / `Ctrl -`.
- **Spanish and English**, switchable in Settings.
- **Icons per section or form:** Lucide icon name or image URL.
- **Built-in tutorial:** on first run the app walks you through the basics.

## Your data (read this, it matters)

Everything lives on your machine, under `%APPDATA%\com.edakzin.gdr`:

| What        | Where          | Notes                                                            |
| ----------- | -------------- | ---------------------------------------------------------------- |
| Database    | `gdr.db`       | Created automatically on first launch, with versioned migrations |
| Backgrounds | `backgrounds/` | Your background images, copied here when you pick them           |

Three things I want you to know:

1. **On uninstall I ask whether you want to keep your data.** Say yes and
   the folder stays, so reinstalling later brings everything back. Say no
   and the whole data folder is removed.
2. **On update I offer to install over the previous version.** The installer
   detects your existing install and lets you update without uninstalling,
   leaving your data untouched.
3. **If your background ever gets lost, I recover it from disk.** The
   background path lives in the app, but the file lives in `backgrounds/`;
   if they ever disagree (fresh profile, reinstall), on startup I adopt the
   newest image found there and clean up the orphaned ones.

## Installation

1. Download the installer from
   [GitHub Releases](https://github.com/EDAKZIN/GDR/releases):
   - `x64`: 64-bit, the one most people want.
   - `x86`: 32-bit, for older machines.
2. Run it. It installs only for your user, no admin rights needed.

## Development

You need [Node.js](https://nodejs.org/) LTS, the stable
[Rust](https://www.rust-lang.org/tools/install) toolchain and Windows 10/11
for the NSIS installer.

```bash
git clone https://github.com/EDAKZIN/GDR.git
cd GDR
npm install
npm run tauri dev
```

| Command                       | What for                                   |
| ----------------------------- | ------------------------------------------ |
| `npm run tauri dev`           | The app in development mode                |
| `npm run build:installer`     | x64 installer                              |
| `npm run build:installer:x86` | x86 installer                              |
| `npm run build:installer:all` | Both                                       |
| `npm run lint`                | Check the code with ESLint                 |
| `npm run format`              | Format everything with Prettier            |
| `npm run migrate`             | Validate the SQL migrations                |
| `cargo check`                 | Check the Rust backend (from `src-tauri/`) |

## How it's organized

```
GDR/
├── src/
│   ├── core/            # Pure domain, no SQL: Zod models and field type registry
│   │   ├── fields/      # The 16 types: validation and JSON serialization
│   │   ├── forms/       # Form models
│   │   ├── records/     # Record entities and ordering
│   │   ├── search/      # Normalization and tokenizing for FTS5
│   │   ├── sections/    # Hierarchy, allow_children and icons
│   │   └── utils/       # Relative time, uuid
│   ├── database/        # The only layer that speaks SQL
│   │   ├── migrations/  # 0001 through 0007 + idempotent runner
│   │   ├── repositories/# sections, forms, fields, records, search
│   │   ├── schema/      # Typed schema with Drizzle
│   │   └── client.ts    # Single connection to sqlite:gdr.db
│   ├── i18n/            # My own homegrown i18n, no dependencies (es/en)
│   ├── stores/          # Global state with Zustand (UI, sections, records)
│   ├── ui/              # React by module: screens, workspace, search, settings...
│   ├── App.tsx          # Root layout and global shortcuts
│   ├── backgroundFiles.ts # Backgrounds in backgrounds/ + recovery on startup
│   ├── main.tsx         # Bootstrap: migrations, FTS index, background
│   ├── theme.ts         # Themes persisted in localStorage
│   └── uiScale.ts       # 70–130 zoom persisted
├── scripts/
│   └── migrate.mjs      # Migration validator (numbering and empties)
└── src-tauri/           # Rust backend and NSIS bundle
    ├── capabilities/    # Plugin permissions (fs, sql, dialog...)
    ├── windows/         # installer.nsi template + hooks (ES/EN, update, keep-data)
    └── tauri.conf.json  # com.edakzin.gdr, currentUser, $APPDATA asset scope
```

The golden rule: `UI (React) → stores (Zustand) → repositories → SQLite / FTS5`.
Screens never touch SQL; repositories are the only ones that run it.

## App languages

I wrote the i18n myself, minimal and dependency-free: Spanish (`es`) rules
and English (`en`) must carry exactly the same keys (TypeScript enforces it
through types). The active language is stored in `localStorage` as
`gdr.lang`.

Want to add another language, say French?

1. Create `src/i18n/fr.ts` with a translated
   `export const fr: Dictionary = { … }`.
2. In `src/i18n/index.tsx` add `"fr"` to `LANGS` and the dictionary to
   `translate`.
3. Add the option to the language selector (it consumes `setLang("fr")`).

Full guide at [`src/i18n/README.md`](../src/i18n/README.md) (Spanish).

> También disponible en español: [`README.md`](../README.md)

## Stack

| Technology                                        | What I use it for                      |
| ------------------------------------------------- | -------------------------------------- |
| [Tauri 2](https://tauri.app/)                     | Desktop app (Rust + web)               |
| [React 19](https://react.dev/)                    | UI                                     |
| [TypeScript](https://www.typescriptlang.org/)     | Letting the compiler catch my mistakes |
| [Tailwind CSS v4](https://tailwindcss.com/)       | Styling                                |
| [SQLite + FTS5](https://www.sqlite.org/fts5.html) | Data and full-text search              |
| [Drizzle ORM](https://orm.drizzle.team/)          | Typed schema                           |
| [Zod](https://zod.dev/)                           | Model validation                       |
| [Zustand](https://zustand.docs.pmnd.rs/)          | Global state                           |
| [Lucide](https://lucide.dev/)                     | Icons                                  |

## License

[MIT](../LICENSE) — made by **EDAKZIN**.
