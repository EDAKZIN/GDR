import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, FolderOpen, Moon, Palette, Sun, X } from "lucide-react";
import { useT } from "../../i18n";
import { GithubIcon } from "../components/GithubIcon";
import {
  ACCENTS,
  getAccent,
  getBackground,
  getTheme,
  setAccent,
  setBackground,
  setTheme,
  subscribeAccent,
  subscribeBackground,
  subscribeTheme,
  type Accent,
  type Theme,
} from "../../theme";
import {
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  getZoom,
  setZoom,
  subscribeZoom,
} from "../../uiScale";
import { modalBackdrop, modalHeader, modalPanel } from "../components/uiStyles";

/** Miniatura fija del tema (usa colores reales del tema, no utilidades vivas). */
function ThemePreview({ theme }: { theme: Theme }) {
  const dark = theme !== "light";
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

const ACCENT_DOTS: Record<Accent, string> = {
  sky: "#0ea5e9",
  emerald: "#10b981",
  teal: "#14b8a6",
  lime: "#84cc16",
  amber: "#f59e0b",
  orange: "#f97316",
  rose: "#f43f5e",
  violet: "#8b5cf6",
};

function isAssetSrc(value: string): boolean {
  return value.startsWith("asset://") || value.includes("asset.localhost");
}

type BgSource = "none" | "url" | "file";

function localBackgroundName(value: string): string {
  try {
    return decodeURIComponent(value.split("/").pop() ?? value);
  } catch {
    return value;
  }
}

/**
 * Modal de Ajustes: Apariencia (tarjetas de tema con mini-preview, aplicación
 * instantánea sin guardar; el tema personalizado suma acento y fondo propio),
 * Tamaño de interfaz (zoom) e Idioma (desplegable que escala a nuevos idiomas
 * sin añadir controles). Esc o clic en el fondo cierran; el idioma vive en
 * i18n y el tema en theme.ts.
 */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useT();
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  const accent = useSyncExternalStore(subscribeAccent, getAccent);
  const background = useSyncExternalStore(subscribeBackground, getBackground);
  const zoom = useSyncExternalStore(subscribeZoom, getZoom);
  const [picking, setPicking] = useState(false);
  const [bgError, setBgError] = useState("");
  const bgSource: BgSource =
    background === "" ? "none" : isAssetSrc(background) ? "file" : "url";

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
    { id: "custom", label: t("ajustes.temaPersonalizado"), icon: Palette },
  ];

  async function pickBackgroundFile(): Promise<void> {
    setPicking(true);
    setBgError("");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"],
          },
        ],
      });
      if (typeof selected !== "string" || selected === "") {
        return;
      }
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const { mkdir, copyFile } = await import("@tauri-apps/plugin-fs");
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      const dir = await join(await appDataDir(), "backgrounds");
      await mkdir(dir, { recursive: true });
      const raw = selected.split(/[/\\]/).pop() ?? "";
      const safe = raw.replace(/[^\w.-]+/g, "_").slice(-80) || "fondo";
      const dest = await join(dir, `${String(Date.now())}-${safe}`);
      await copyFile(selected, dest);
      setBackground(convertFileSrc(dest));
    } catch (error) {
      setBgError(error instanceof Error ? error.message : String(error));
    } finally {
      setPicking(false);
    }
  }

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

        <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto px-5 py-4">
          {/* Grupo 1: Apariencia */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("ajustes.apariencia")}
            </h3>
            <p className="text-xs text-zinc-500">{t("ajustes.aparienciaDesc")}</p>
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label={t("ajustes.apariencia")}>
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
            {theme === "custom" ? (
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-zinc-200">{t("ajustes.acento")}</p>
                  <p className="text-xs text-zinc-500">{t("ajustes.acentoDesc")}</p>
                  <div
                    className="flex items-center gap-2"
                    role="radiogroup"
                    aria-label={t("ajustes.acento")}
                  >
                    {ACCENTS.map((id) => {
                      const active = accent === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          title={id}
                          aria-label={id}
                          onClick={() => {
                            setAccent(id);
                          }}
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-150 ${
                            active
                              ? "border-white ring-2 ring-white/60"
                              : "border-zinc-600 hover:border-zinc-400"
                          }`}
                          style={{ backgroundColor: ACCENT_DOTS[id] }}
                        >
                          {active ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-zinc-200">{t("ajustes.fondo")}</p>
                  <select
                    aria-label={t("ajustes.fondoFuente")}
                    value={bgSource}
                    onChange={(event) => {
                      const next = event.target.value as BgSource;
                      setBgError("");
                      if (next === "none") {
                        setBackground("");
                      } else if (next === "url") {
                        if (isAssetSrc(background)) {
                          setBackground("");
                        }
                      } else if (background !== "" && !isAssetSrc(background)) {
                        setBackground("");
                      }
                    }}
                    className="w-full cursor-pointer appearance-none rounded-md border border-zinc-700 bg-zinc-900 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat px-2.5 py-1.5 pr-8 text-xs text-zinc-200 outline-none transition-colors duration-150 hover:border-zinc-600 focus:border-sky-400"
                  >
                    {(
                      [
                        ["none", t("ajustes.fondoNinguno")],
                        ["url", t("ajustes.fondoUrl")],
                        ["file", t("ajustes.fondoArchivo")],
                      ] as const
                    ).map(([id, label]) => (
                      <option key={id} value={id} className="bg-zinc-900 text-zinc-200">
                        {label}
                      </option>
                    ))}
                  </select>
                  {bgSource === "url" ? (
                    <input
                      type="text"
                      spellCheck={false}
                      aria-label={t("ajustes.fondoUrl")}
                      placeholder={t("ajustes.fondoUrlPlaceholder")}
                      value={background}
                      onChange={(event) => {
                        setBgError("");
                        setBackground(event.target.value);
                      }}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 outline-none transition-colors duration-150 placeholder:text-zinc-600 hover:border-zinc-600 focus:border-sky-400"
                    />
                  ) : null}
                  {bgSource === "file" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void pickBackgroundFile();
                        }}
                        disabled={picking}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors duration-150 hover:border-zinc-600 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        {t("ajustes.fondoExaminar")}
                      </button>
                      {isAssetSrc(background) ? (
                        <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
                          {localBackgroundName(background)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {bgError !== "" ? (
                    <p role="alert" className="text-[11px] text-rose-300">
                      {t("ajustes.fondoError", { n: bgError })}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {/* Grupo 2: Tamaño de interfaz */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("ajustes.tamano")}
            </h3>
            <p className="text-xs text-zinc-500">
              {t("ajustes.tamanoDesc")}
              <br />
              {t("ajustes.tamanoAtajos")}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={zoom}
                aria-label={t("ajustes.tamano")}
                onChange={(event) => {
                  setZoom(Number(event.target.value));
                }}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-sky-500"
              />
              <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-200">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoom(ZOOM_DEFAULT);
                }}
                disabled={zoom === ZOOM_DEFAULT}
                className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors duration-150 hover:border-zinc-600 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-40"
              >
                {t("ajustes.restablecer")}
              </button>
            </div>
          </section>

          {/* Grupo 3: Idioma */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("ajustes.idioma")}
            </h3>
            <p className="text-xs text-zinc-500">{t("ajustes.idiomaDesc")}</p>
            <div className="flex flex-col gap-1" role="radiogroup" aria-label={t("ajustes.idioma")}>
              {/* Desplegable: escala a nuevos idiomas sin añadir controles. */}
              <select
                aria-label={t("ajustes.idioma")}
                value={lang}
                onChange={(event) => {
                  setLang(event.target.value as "es" | "en");
                }}
                className="w-full cursor-pointer appearance-none rounded-md border border-zinc-700 bg-zinc-900 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat px-2.5 py-1.5 pr-8 text-xs text-zinc-200 outline-none transition-colors duration-150 hover:border-zinc-600 focus:border-sky-400"
              >
                {(
                  [
                    ["es", t("ajustes.espanol")],
                    ["en", t("ajustes.ingles")],
                  ] as const
                ).map(([id, label]) => (
                  <option key={id} value={id} className="bg-zinc-900 text-zinc-200">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("ajustes.acerca")}
            </h3>
            <p className="text-xs text-zinc-500">{t("ajustes.acercaDesc")}</p>
            <a
              href="https://github.com/EDAKZIN"
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                event.preventDefault();
                void import("@tauri-apps/plugin-opener").then(({ openUrl }) =>
                  openUrl("https://github.com/EDAKZIN"),
                );
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 underline-offset-4 hover:text-zinc-100 hover:underline"
            >
              <GithubIcon className="h-4 w-4" />
              {t("ajustes.verGithub")}
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
