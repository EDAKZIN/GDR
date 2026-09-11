# i18n

Minimal internationalization with no external dependencies. Spanish (`es`) is
the default language and the source of truth for keys; English (`en`) must
carry exactly the same keys (enforced by typing).

## How it works

- `es.ts` defines the dictionary and the `Dictionary` type.
- `en.ts` implements `Dictionary`: if a key is missing or extra, `tsc` fails.
- `index.tsx` exposes:
  - `useT()` → `{ t, lang, setLang }` for React components.
  - `translate(key, params)` → for code outside React (stores, core).
  - `setLang(lang)` / `getLang()` → active language, persisted in
    `localStorage` under the `gdr.lang` key.

## Adding a new key

1. Add the key to the matching domain in `src/i18n/es.ts`:

   ```ts
   registros: {
     // …
     miClave: "Texto con {n} interpolación",
   }
   ```

2. Add the same path in `src/i18n/en.ts` (otherwise `tsc --noEmit` errors).
3. Use it: `t("registros.miClave", { n: valor })`. If the text lives in a
   store or module without React, use `translate("registros.miClave", { n: valor })`.

## Adding a third language

1. Create `src/i18n/fr.ts` with a translated
   `export const fr: Dictionary = { … }`.
2. In `src/i18n/index.tsx`:
   - Add `"fr"` to the `LANGS` tuple.
   - Import `fr` and use it in `translate`: the dictionary is picked from
     `currentLang`; extend the selection (`"fr" ? fr : …`) or turn it into a
     `Record<Lang, Dictionary>` map.
3. Add the selector button/entry that consumes `setLang("fr")`.
