# GDR

**GDR** es un gestor de datos genérico de escritorio: el usuario define sus propias
secciones, formularios y campos (texto, números, fechas, etiquetas, selección,
imágenes, contraseñas…) y organiza registros con ellos. Nada está hardcodeado:
la estructura la decide el usuario en tiempo de ejecución.

- **Autor:** EDAKZIN
- **Licencia:** [MIT](LICENSE)

## Stack

- **Tauri 2** (shell de escritorio, Rust) + **SQLite** vía `plugin-sql`
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (estado), **Zod** (validación), **Drizzle ORM** (definición de esquema)
- **FTS5** (búsqueda global con índice de texto completo)
- Iconos **Lucide** (nombres o URL personalizables por sección)

## Cómo ejecutar

```bash
npm install
npm run tauri dev
```

Otros comandos útiles:

```bash
npm run build      # compilación TypeScript + bundle Vite
npm run lint       # ESLint
npm run migrate    # valida las migraciones SQL del proyecto
cargo check        # verificación del backend Rust (en src-tauri/)
```

La base de datos SQLite (`gdr.db`) se crea automáticamente al arrancar la app
aplicando las migraciones de `src/database/migrations/`.

## Estructura

```
GDR/
├── src/
│   ├── core/           # Dominio puro: modelos Zod, tipos, registro de campos
│   │   ├── fields/     # Tipos de campo, validación, serialización de valores
│   │   ├── forms/      # Formularios
│   │   ├── sections/   # Secciones
│   │   ├── records/    # Registros
│   │   └── search/     # Contrato de búsqueda
│   ├── database/       # Cliente SQLite, migraciones SQL y repositorios
│   │   ├── migrations/ # SQL versionado (0001_init, 0002_fts…)
│   │   └── repositories/# Acceso a datos + mantenimiento del índice FTS5
│   ├── stores/         # Estado global (zustand): secciones y registros
│   ├── ui/             # Componentes React por módulo
│   │   ├── sections/   # Sidebar con menú contextual e iconos
│   │   ├── forms/      # Lista de formularios y constructor de campos
│   │   ├── records/    # Lista, detalle y editor de registros
│   │   ├── search/     # Buscador global (Ctrl+K)
│   │   └── components/ # IconRenderer y utilidades visuales
│   └── main.tsx        # Bootstrap: migraciones + reíndice FTS5 + render
├── scripts/            # Utilidades (validación de migraciones)
└── src-tauri/          # Backend Tauri/Rust y configuración
```

## Filosofía

El usuario define la estructura: secciones → formularios → campos → registros.
No hay entidades ni formularios predefinidos en el código; todo se construye
desde la interfaz y se guarda en SQLite con soft delete (papelera por nivel),
orden manual y búsqueda global instantánea sobre los campos marcados como
«buscables» (nunca indexa contraseñas).
