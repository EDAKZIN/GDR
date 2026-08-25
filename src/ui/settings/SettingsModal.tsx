import { useEffect, useSyncExternalStore } from "react";
import { Check, Moon, Sun, X } from "lucide-react";
import { useT } from "../../i18n";
import { getTheme, setTheme, subscribeTheme, type Theme } from "../../theme";
import { modalBackdrop, modalHeader, modalPanel } from "../components/uiStyles";

/** Miniatura fija del tema (usa colores reales del tema, no utilidades vivas). */
function ThemePreview({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  return (
    <span
      aria-hidden
      className="flex h-16 w-full flex-col overflow-hidden rounded-md border"
      style={{
        backgroundColor: dark ? "#09090b" : "#f4f4f5",
        borderColor: dark ? "#3f3f46" : "#d4d4d8",
      }}
    >
      <span
        className="flex h-3.5 items-center gap-1 px-1.5"
        style={{
          backgroundColor: dark ? "#18181b" : "#ffffff",
          borderBottom: dark ? "1px solid #27272a" : "1px solid #e4e4e7",
        }}
      >
        <span className="h-1 w-6 rounded-full" style={{ backgroundColor: "#0284c7" }} />
        <span className="h-1 w-4 rounded-full" style={{ backgroundColor: dark ? "#52525b" : "#a1a1aa" }} />
      </span>
      <span className="flex flex-1 flex-col gap-1 p-1.5">
        <span
          className="h-2 w-3/4 rounded-full"
          style={{ backgroundColor: dark ? "#d4d4d8" : "#3f3f46" }}
        />
        <span
          className="h-2 w-1/2 rounded-full"
          style={{ backgroundColor: dark ? "#3f3f46" : "#d4d4d8" }}
        />
      </span>
    </span>
  );
}

/**
 * Modal de Ajustes: dos grupos en orden de uso — Apariencia (tarjetas de tema
 * con mini-preview, aplicación instantánea sin guardar) e Idioma (radios).
 * Esc o clic en el fondo cierran; el idioma vive en i18n y el tema en theme.ts.
 */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useT();
  const theme = useSyncExternalStore(subscribeTheme, getTheme);

  // Esc cierra el modal.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const themes: ReadonlyArray<{ id: Theme; label: string; icon: typeof Moon }> = [
    { id: "dark", label: t("ajustes.temaOscuro"), icon: Moon },
    { id: "light", label: t("ajustes.temaClaro"), icon: Sun },
  ];

  return (
    <div
      className={modalBackdrop}
      onClick={() => {
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("ajustes.titulo")}
        className={`${modalPanel} max-w-md`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={modalHeader}>
          <h2 className="text-sm font-semibold text-zinc-100">{t("ajustes.titulo")}</h2>
          <button
            type="button"
            title={t("ajustes.cerrar")}
            aria-label={t("ajustes.cerrar")}
            className="rounded-md p-1 text-zinc-400 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => {
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          {/* Grupo 1: Apariencia */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("ajustes.apariencia")}
            </h3>
            <p className="text-xs text-zinc-500">{t("ajustes.aparienciaDesc")}</p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("ajustes.apariencia")}>
              {themes.map((option) => {
                const active = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors duration-150 ${
                      active
                        ? "border-sky-500/60 bg-sky-500/10"
                        : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/60"
                    }`}
                    onClick={() => {
                      setTheme(option.id);
                    }}
                  >
                    <ThemePreview theme={option.id} />
                    <span className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <option.icon className="h-3.5 w-3.5" />
                        {option.label}
                      </span>
                      {active ? <Check className="h-3.5 w-3.5 text-sky-400" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Grupo 2: Idioma */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("ajustes.idioma")}
            </h3>
            <p className="text-xs text-zinc-500">{t("ajustes.idiomaDesc")}</p>
            <div className="flex flex-col gap-1" role="radiogroup" aria-label={t("ajustes.idioma")}>
              {(
                [
                  ["es", t("ajustes.espanol")],
                  ["en", t("ajustes.ingles")],
                ] as const
              ).map(([id, label]) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors duration-150 ${
                    lang === id
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                      : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="settings-lang"
                    className="shrink-0 accent-sky-500"
                    checked={lang === id}
                    onChange={() => {
                      setLang(id);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
