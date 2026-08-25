# i18n

Internacionalización mínima sin dependencias externas. Español (`es`) es el
idioma por defecto y la fuente de la verdad de las claves; inglés (`en`) debe
tener exactamente las mismas claves (lo garantiza el tipado).

## Cómo funciona

- `es.ts` define el diccionario y el tipo `Dictionary`.
- `en.ts` implementa `Dictionary`: si falta o sobra una clave, `tsc` falla.
- `index.tsx` expone:
  - `useT()` → `{ t, lang, setLang }` para componentes React.
  - `translate(key, params)` → para código fuera de React (stores, core).
  - `setLang(lang)` / `getLang()` → idioma activo, persistido en
    `localStorage` con la clave `gdr.lang`.

## Añadir una clave nueva

1. Añade la clave al dominio correspondiente en `src/i18n/es.ts`:

   ```ts
   registros: {
     // …
     miClave: "Texto con {n} interpolación",
   }
   ```

2. Añade la misma ruta en `src/i18n/en.ts` (si no, `tsc --noEmit` dará error).
3. Úsala: `t("registros.miClave", { n: valor })`. Si el texto va en un store o
   módulo sin React, usa `translate("registros.miClave", { n: valor })`.

## Añadir un tercer idioma

1. Crea `src/i18n/fr.ts` con `export const fr: Dictionary = { … }` traducido.
2. En `src/i18n/index.tsx`:
   - Añade `"fr"` a la tupla `LANGS`.
   - Importa `fr` y úsalo en `translate`: el diccionario se elige según
     `currentLang`; amplía la selección (`"fr" ? fr : …`) o conviértela en un
     mapa `Record<Lang, Dictionary>`.
3. Añade el botón/entrada del selector de idioma que consuma `setLang("fr")`.
