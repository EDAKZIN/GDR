import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useT } from "../../i18n";
import { FloatingMenu, type FloatingMenuAnchor } from "./FloatingMenu";
import { IconRenderer } from "./IconRenderer";
import { SUGGESTED_ICON_NAMES } from "./iconNames";

function isUrlLike(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    /^[a-z]:\\|^\/\//i.test(trimmed)
  );
}

function normalizeForSearch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function IconPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useT();
  const [menu, setMenu] = useState<FloatingMenuAnchor | null>(null);

  const urlMode = isUrlLike(value);

  const filtered = useMemo(() => {
    if (urlMode) return [];
    const needle = normalizeForSearch(value);
    if (needle === "") return [...SUGGESTED_ICON_NAMES];
    return SUGGESTED_ICON_NAMES.filter((name) =>
      normalizeForSearch(name).includes(needle),
    );
  }, [value, urlMode]);

  return (
    <div className="relative flex flex-1 items-center gap-1.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-zinc-800 text-sky-300">
        <IconRenderer icon={value} />
      </span>
      <div className="relative flex flex-1">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder ?? t("secciones.iconoPlaceholder")}
          maxLength={100}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 pr-8 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400"
        />
        <button
          type="button"
          aria-label="Desplegar opciones"
          className="absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500 hover:text-zinc-200"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMenu((previous) => (previous !== null ? null : rect));
          }}
          tabIndex={-1}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${menu !== null ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {value && (
        <button
          type="button"
          aria-label={t("comun.cerrar")}
          className="shrink-0 rounded p-1 text-zinc-500 hover:text-zinc-200"
          onClick={() => {
            onChange("");
          }}
          tabIndex={-1}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {menu !== null && !urlMode ? (
        <FloatingMenu
          anchor={menu}
          widthClass="w-72"
          onClose={() => {
            setMenu(null);
          }}
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-zinc-500">Sin coincidencias</p>
          ) : (
            <div className="grid grid-cols-6 gap-1 p-1">
              {filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  className={`flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-[10px] transition-colors ${
                    value === name
                      ? "border-sky-500 bg-sky-500/15 text-sky-300"
                      : "border-zinc-800 bg-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                  onClick={() => {
                    onChange(name);
                    setMenu(null);
                  }}
                >
                  <IconRenderer icon={name} className="h-4 w-4" />
                  <span className="truncate leading-none">{name}</span>
                </button>
              ))}
            </div>
          )}
          <p className="flex items-center justify-between border-t border-zinc-800 px-2 pb-1 pt-1 text-[10px] text-zinc-600">
            <span>Escribe para filtrar · pega una URL https://… para usar una imagen</span>
            <a
              href="https://lucide.dev/icons/"
              target="_blank"
              rel="noreferrer"
              title="Abrir el catálogo de Lucide para buscar un icono"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void import("@tauri-apps/plugin-opener").then(({ openUrl }) =>
                  openUrl("https://lucide.dev/icons/"),
                );
              }}
              className="inline-flex shrink-0 items-center gap-0.5 text-sky-400 hover:text-sky-300 hover:underline"
            >
              lucide.dev
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
        </FloatingMenu>
      ) : null}

      {menu !== null && urlMode ? (
        <FloatingMenu
          anchor={menu}
          widthClass="w-72"
          onClose={() => {
            setMenu(null);
          }}
        >
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800">
              <IconRenderer icon={value} className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{value}</span>
          </div>
          <p className="border-t border-zinc-800 px-2 pb-1 pt-1 text-[10px] text-zinc-600">
            Modo imagen por URL · borra para ver iconos Lucide
          </p>
        </FloatingMenu>
      ) : null}
    </div>
  );
}
