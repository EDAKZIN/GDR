# GDR

Hola, soy **EDAKZIN** y este es mi gestor de datos personales. Lo hice porque
estaba cansado de encajar mi información en apps que ya decidieron por mí cómo
organizarla: aquí no hay nada hardcodeado. Tú creas tus secciones, armas tus
plantillas de formularios con los campos que quieras y guardas tus registros.
La app solo te da el motor.

Está construida con **Tauri 2**, **React 19** y **SQLite**, y se instala como
una app de escritorio normal en Windows.

## Qué puedes hacer

- **Secciones a tu manera:** cada sección puede ser un contenedor con hasta 5
  subsecciones o una lista plana que va directo a los registros.
- **Formularios con 16 tipos de campo:** texto, texto largo, número, sí/no,
  fecha, fecha y hora, teléfono (con validación real), correo, URL,
  contraseña, selección, selección múltiple, etiquetas, calificación, ruta de
  archivo e imagen.
- **Dos vistas para tus registros:** tabla densa para revisar muchos de golpe
  y ficha de detalle para verlos con calma.
- **Búsqueda global con `Ctrl+F`:** rapidísima gracias a FTS5, tolera que
  escribas sin acentos y guarda tu historial. Las contraseñas jamás se
  indexan, por diseño.
- **Papeleras con restauración:** todo se borra suave primero (secciones,
  formularios, campos y registros). El borrado permanente solo existe dentro
  de la papelera, para que no pierdas nada por accidente.
- **Reordenar manteniendo presionado:** ~350 ms sobre el elemento y lo
  arrastras. Así no hay reordenamientos accidentales.
- **Tres temas:** oscuro, claro y personalizado (con tu color de acento y tu
  propia imagen de fondo, por archivo o por URL). Más zoom de interfaz de
  70% a 130% con `Ctrl +` / `Ctrl -`.
- **Español e inglés**, cambiables en Ajustes.
- **Iconos por sección o formulario:** nombre de icono Lucide o imagen por
  URL.
- **Tutorial incluido:** la primera vez la app te pasea por lo esencial.

## Tus datos (léeme, esto importa)

Todo vive en tu máquina, en `%APPDATA%\com.edakzin.gdr`:

| Qué           | Dónde          | Notas                                                        |
| ------------- | -------------- | ------------------------------------------------------------ |
| Base de datos | `gdr.db`       | Se crea sola al primer arranque, con migraciones versionadas |
| Fondos        | `backgrounds/` | Tus imágenes de fondo, copiadas aquí al elegirlas            |

Tres cosas que quiero que sepas:

1. **Al desinstalar te pregunto si quieres conservar tus datos.** Si dices
   que sí, la carpeta se queda y al reinstalar todo sigue ahí. Si dices que
   no, se borra completa.
2. **Al actualizar te ofrezco no desinstalar.** El instalador detecta tu
   versión anterior y te deja actualizar encima, sin tocar tus datos.
3. **Si tu fondo se pierde, lo recupero del disco.** La ruta del fondo vive
   en la app, pero el archivo vive en `backgrounds/`; si un día no coinciden
   (perfil nuevo, reinstalación), al arrancar adopto la imagen más reciente
   que encuentre ahí y limpio las huérfanas.

## Instalación

1. Descarga el instalador desde
   [GitHub Releases](https://github.com/EDAKZIN/GDR/releases):
   - `x64`: 64 bits, el de la mayoría.
   - `x86`: 32 bits, para equipos viejos.
2. Ejecútalo. Se instala solo para tu usuario, sin pedirte administrador.

## Desarrollo

Necesitas [Node.js](https://nodejs.org/) LTS, el toolchain estable de
[Rust](https://www.rust-lang.org/tools/install) y Windows 10/11 para el
instalador NSIS.

```bash
git clone https://github.com/EDAKZIN/GDR.git
cd GDR
npm install
npm run tauri dev
```

| Comando                       | Para qué                                     |
| ----------------------------- | -------------------------------------------- |
| `npm run tauri dev`           | La app en modo desarrollo                    |
| `npm run build:installer`     | Instalador x64                               |
| `npm run build:installer:x86` | Instalador x86                               |
| `npm run build:installer:all` | Ambos                                        |
| `npm run lint`                | Revisar el código con ESLint                 |
| `npm run format`              | Formatear todo con Prettier                  |
| `npm run migrate`             | Validar las migraciones SQL                  |
| `cargo check`                 | Revisar el backend Rust (desde `src-tauri/`) |

## Cómo está organizado

```
GDR/
├── src/
│   ├── core/            # Dominio puro, sin SQL: modelos Zod y registro de tipos de campo
│   │   ├── fields/      # Los 16 tipos: validación y serialización JSON
│   │   ├── forms/       # Modelos de formularios
│   │   ├── records/     # Entidades y orden de registros
│   │   ├── search/      # Normalización y tokenizado para FTS5
│   │   ├── sections/    # Jerarquía, allow_children e iconos
│   │   └── utils/       # Tiempo relativo, uuid
│   ├── database/        # Lo único que habla SQL
│   │   ├── migrations/  # 0001 a 0007 + runner idempotente
│   │   ├── repositories/# sections, forms, fields, records, search
│   │   ├── schema/      # Esquema tipado con Drizzle
│   │   └── client.ts    # Conexión única a sqlite:gdr.db
│   ├── i18n/            # Mi sistema de idiomas, sin dependencias (es/en)
│   ├── stores/          # Estado global con Zustand (UI, secciones, registros)
│   ├── ui/              # React por módulo: screens, workspace, search, settings...
│   ├── App.tsx          # Layout raíz y atajos globales
│   ├── backgroundFiles.ts # Fondos en backgrounds/ + recuperación al arrancar
│   ├── main.tsx         # Bootstrap: migraciones, índice FTS, fondo
│   ├── theme.ts         # Temas persistidos en localStorage
│   └── uiScale.ts       # Zoom 70–130 persistido
├── scripts/
│   └── migrate.mjs      # Validador de migraciones (numeración y vacías)
└── src-tauri/           # Backend Rust y bundle NSIS
    ├── capabilities/    # Permisos de plugins (fs, sql, dialog...)
    ├── windows/         # Plantilla installer.nsi + hooks (ES/EN, update, keep-data)
    └── tauri.conf.json  # com.edakzin.gdr, currentUser, asset scope $APPDATA
```

La regla de oro: `UI (React) → stores (Zustand) → repositorios → SQLite / FTS5`.
Las pantallas nunca tocan SQL; los repositorios son los únicos que lo ejecutan.

## Idiomas de la app

El sistema lo hice yo, mínimo y sin dependencias: español (`es`) manda y el
inglés (`en`) tiene que tener exactamente las mismas claves (TypeScript lo
exige por tipos). El idioma activo se guarda en `localStorage` como
`gdr.lang`.

¿Quieres agregar otro idioma, digamos francés?

1. Crea `src/i18n/fr.ts` con `export const fr: Dictionary = { … }` traducido.
2. En `src/i18n/index.tsx` agrega `"fr"` a `LANGS` y el diccionario al
   `translate`.
3. Agrega la opción al selector de idioma (usa `setLang("fr")`).

Tienes la guía completa en [`src/i18n/README.md`](src/i18n/README.md).

> Also available in English: [`docs/README.en.md`](docs/README.en.md)

## Stack

| Tecnología                                        | Para qué la uso                         |
| ------------------------------------------------- | --------------------------------------- |
| [Tauri 2](https://tauri.app/)                     | App de escritorio (Rust + web)          |
| [React 19](https://react.dev/)                    | Interfaz                                |
| [TypeScript](https://www.typescriptlang.org/)     | Que el compilador me atrape los errores |
| [Tailwind CSS v4](https://tailwindcss.com/)       | Estilos                                 |
| [SQLite + FTS5](https://www.sqlite.org/fts5.html) | Datos y búsqueda de texto completo      |
| [Drizzle ORM](https://orm.drizzle.team/)          | Esquema tipado                          |
| [Zod](https://zod.dev/)                           | Validación de modelos                   |
| [Zustand](https://zustand.docs.pmnd.rs/)          | Estado global                           |
| [Lucide](https://lucide.dev/)                     | Iconos                                  |

## Licencia

[MIT](LICENSE) — hecho por **EDAKZIN**.
