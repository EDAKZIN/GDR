import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { History, Loader2, Search, SearchX, X } from "lucide-react";
import type { SearchResult } from "../../core/search";
import { FIELD_TYPES, FIELD_TYPE_REGISTRY, type FieldType } from "../../core/fields";
import { createFormsRepository, createSearchRepository } from "../../database/repositories";
import { getDb } from "../../database/client";
import { useT } from "../../i18n";
import { useRecordStore, useSectionStore, useUiStore } from "../../stores";

const searchRepository = createSearchRepository(getDb);
const formsRepository = createFormsRepository(getDb);

const DEBOUNCE_MS = 150;
const RESULT_LIMIT = 50;
const HISTORY_KEY = "gdr.global-search.history";
const HISTORY_SIZE = 5;
/** Tipos ofrecidos como filtro (las contraseñas nunca se indexan). */
const FILTER_FIELD_TYPES: readonly string[] = FIELD_TYPES.filter((type) => type !== "password");

interface ResultGroup {
  sectionName: string;
  items: SearchResult[];
}

type Entry = { kind: "history"; query: string } | { kind: "result"; result: SearchResult };

function loadHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string").slice(0, HISTORY_SIZE);
  } catch {
    return [];
  }
}

function saveToHistory(query: string): string[] {
  const previous = loadHistory().filter((item) => item !== query);
  const next = [query, ...previous].slice(0, HISTORY_SIZE);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Sin persistencia disponible: el historial simplemente no se guarda.
  }
  return next;
}

function removeFromHistory(item: string): string[] {
  const next = loadHistory().filter((candidate) => candidate !== item);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Sin persistencia disponible: el historial simplemente no se guarda.
  }
  return next;
}

function clearStoredHistory(): string[] {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch {
    // Sin persistencia disponible: el historial simplemente no se guarda.
  }
  return [];
}

/** Renderiza el snippet resaltando los marcadores «coincidencia». */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/«([^»]*)»/u);
  return (
    <span>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-sm bg-sky-500/20 px-0.5 text-sky-300">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}

/**
 * Espera a que App (vía useFormSync) abra el formulario en useRecordStore
 * tras cambiar la selección; si tarda demasiado devuelve false.
 */
function waitForRecordForm(formId: string, timeoutMs = 2000): Promise<boolean> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const tick = (): void => {
      const state = useRecordStore.getState();
      if (state.formId === formId && !state.loading) {
        resolve(true);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

async function navigateToResult(result: SearchResult): Promise<void> {
  const sections = useSectionStore.getState();
  const section = sections.sections.find((candidate) => candidate.id === result.sectionId);
  await sections.selectSection(result.sectionId);
  sections.selectForm(result.formId);
  // En secciones planas la vista de registros es la propia sección (un solo
  // nivel); en jerárquicas se abre el workspace del formulario.
  if (section !== undefined && !section.allowChildren) {
    useUiStore.getState().navigate("section", result.sectionId);
  } else {
    useUiStore.getState().navigate("form", result.formId);
  }

  // El efecto useFormSync de App abre el formulario en useRecordStore;
  // si por timing no llegara a hacerlo, se abre manualmente.
  const opened = await waitForRecordForm(result.formId);
  if (!opened) {
    await useRecordStore.getState().openForm(result.formId);
  }
  await useRecordStore.getState().openRecord(result.recordId);
}

const selectClass =
  "max-w-[10rem] truncate rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none focus:border-sky-400";

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [exact, setExact] = useState(true);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [rawActiveIndex, setActiveIndex] = useState(0);

  // Filtros del overlay.
  const [sectionFilter, setSectionFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [typeFilters, setTypeFilters] = useState<readonly string[]>([]);
  const [formOptions, setFormOptions] = useState<Array<{ id: string; name: string }>>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const entryRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const liveSections = useSectionStore((store) => store.sections);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc cierra el overlay.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // Opciones de formulario dependientes de la sección elegida (la limpieza al
  // deseleccionar sección ocurre en su propio onChange).
  useEffect(() => {
    if (sectionFilter === "") {
      return;
    }
    let cancelled = false;
    formsRepository
      .listBySection(sectionFilter)
      .then((forms) => {
        if (!cancelled) {
          setFormOptions(
            forms.filter((form) => form.enabled).map((form) => ({ id: form.id, name: form.name })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFormOptions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sectionFilter]);

  // Búsqueda con debounce corto (~150 ms): predictiva mientras se escribe.
  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (trimmed === "") {
        setResults([]);
        setActiveIndex(0);
        setExact(true);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchRepository
        .search(trimmed, {
          limit: RESULT_LIMIT,
          ...(sectionFilter !== "" ? { sectionId: sectionFilter } : {}),
          ...(formFilter !== "" ? { formId: formFilter } : {}),
          ...(typeFilters.length > 0 ? { fieldTypes: typeFilters } : {}),
        })
        .then((outcome) => {
          if (cancelled) {
            return;
          }
          setResults(outcome.results);
          setActiveIndex(0);
          setExact(outcome.exact);
          // El historial solo registra búsquedas concluidas (al abrir un
          // resultado), no cada prefijo tecleado durante el debounce.
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setActiveIndex(0);
            setExact(true);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, sectionFilter, formFilter, typeFilters]);

  /** Resultados agrupados por sección. */
  const groups = useMemo<ResultGroup[]>(() => {
    const bySection = new Map<string, ResultGroup>();
    for (const result of results) {
      let group = bySection.get(result.sectionName);
      if (group === undefined) {
        group = { sectionName: result.sectionName, items: [] };
        bySection.set(result.sectionName, group);
      }
      group.items.push(result);
    }
    return [...bySection.values()];
  }, [results]);

  /** Entradas navegables con teclado: historial (sin texto) o resultados. */
  const entries = useMemo<Entry[]>(
    () =>
      query.trim() === ""
        ? history.map((item) => ({ kind: "history", query: item }) as const)
        : groups.flatMap((group) =>
            group.items.map((result) => ({ kind: "result", result }) as const),
          ),
    [groups, history, query],
  );

  const maxIndex = entries.length - 1;
  // Índice activo derivado y acotado: nunca apunta fuera de la lista aunque
  // los resultados cambien entre pulsaciones de tecla.
  const activeIndex = Math.min(rawActiveIndex, Math.max(0, maxIndex));

  // Mantener visible la entrada activa al navegar con flechas.
  useEffect(() => {
    entryRefs.current.get(activeIndex)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  async function onPick(result: SearchResult): Promise<void> {
    onClose();
    // La búsqueda solo entra en el historial cuando el usuario la usa para
    // abrir un registro (búsqueda concluida), no mientras escribe.
    setHistory(saveToHistory(query.trim()));
    try {
      await navigateToResult(result);
    } catch (error) {
      useRecordStore.setState({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Ejecutar una búsqueda del historial: rellenar y dejar que busque el debounce. */
  function runHistoryQuery(item: string): void {
    setQuery(item);
    setActiveIndex(0);
  }

  /** Elimina solo esa entrada del historial sin ejecutar la búsqueda. */
  function deleteHistoryItem(event: ReactMouseEvent<HTMLButtonElement>, item: string): void {
    event.stopPropagation();
    setHistory(removeFromHistory(item));
  }

  /** Vacía el historial completo (solo se ofrece con más de una entrada). */
  function clearHistory(): void {
    setHistory(clearStoredHistory());
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, entries.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && entries.length > 0) {
      event.preventDefault();
      const entry = entries[activeIndex];
      if (entry.kind === "result") {
        void onPick(entry.result);
      } else {
        runHistoryQuery(entry.query);
      }
    }
  }

  function toggleType(type: string): void {
    setTypeFilters((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery !== "";
  const showNearHint = hasQuery && !searching && results.length > 0 && !exact;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[10vh]"
      onClick={onClose}
    >
      {/* El clic dentro del panel no debe cerrar el overlay. */}
      <div
        className="flex max-h-[75vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("busqueda.placeholder")}
            className="w-full bg-transparent py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {searching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-500" /> : null}
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label={t("busqueda.cerrarAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filtros compactos: sección, formulario y tipos de campo. */}
        <div className="flex flex-col gap-1.5 border-b border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <select
              className={selectClass}
              value={sectionFilter}
              onChange={(event) => {
                setSectionFilter(event.target.value);
                setFormFilter("");
                setFormOptions([]);
              }}
              aria-label={t("busqueda.filtrarSeccionAria")}
            >
              <option value="">{t("busqueda.todasLasSecciones")}</option>
              {liveSections
                .filter((section) => section.enabled)
                .map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
            </select>
            {sectionFilter !== "" ? (
              <select
                className={selectClass}
                value={formFilter}
                onChange={(event) => {
                  setFormFilter(event.target.value);
                }}
                aria-label={t("busqueda.filtrarFormularioAria")}
              >
                <option value="">{t("busqueda.todosLosFormularios")}</option>
                {formOptions.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTER_FIELD_TYPES.map((type) => {
              const active = typeFilters.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => {
                    toggleType(type);
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    active
                      ? "border-sky-400/60 bg-sky-500/20 text-sky-300"
                      : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {FIELD_TYPE_REGISTRY[type as FieldType].label}
                </button>
              );
            })}
            {typeFilters.length > 0 ? (
              <button
                onClick={() => {
                  setTypeFilters([]);
                }}
                className="rounded-full px-2 py-0.5 text-[10px] text-zinc-500 underline-offset-2 hover:text-sky-300 hover:underline"
              >
                {t("busqueda.limpiar")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!hasQuery ? (
            history.length > 0 ? (
              <div>
                <p className="sticky top-0 flex items-center justify-between bg-zinc-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("busqueda.recientes")}
                  {history.length > 1 ? (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[10px] font-normal normal-case tracking-normal text-zinc-600 transition-colors hover:text-sky-300"
                    >
                      {t("busqueda.borrarTodo")}
                    </button>
                  ) : null}
                </p>
                <ul>
                  {entries.map((entry, index) =>
                    entry.kind === "history" ? (
                      <li
                        key={`history:${entry.query}`}
                        className={`group relative ${index === activeIndex ? "bg-zinc-800" : ""}`}
                      >
                        <button
                          ref={(node) => {
                            if (node !== null) {
                              entryRefs.current.set(index, node);
                            } else {
                              entryRefs.current.delete(index);
                            }
                          }}
                          onMouseEnter={() => {
                            setActiveIndex(index);
                          }}
                          onClick={() => {
                            setQuery(entry.query);
                            setActiveIndex(0);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left"
                        >
                          <History className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                          <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                            {entry.query}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-700 hover:text-zinc-100 focus-visible:opacity-100 ${
                            index === activeIndex ? "opacity-100" : ""
                          } group-hover:opacity-100`}
                          aria-label={t("busqueda.eliminarDelHistorial", { n: entry.query })}
                          onClick={(event) => {
                            deleteHistoryItem(event, entry.query);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-zinc-600">
                {t("busqueda.escribeHint")}
              </p>
            )
          ) : !searching && results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <SearchX className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">{t("busqueda.sinResultados", { n: trimmedQuery })}</p>
            </div>
          ) : (
            <>
              {showNearHint ? (
                <p className="border-b border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300">
                  {t("busqueda.sinExactos", { n: trimmedQuery })}
                </p>
              ) : null}
              {groups.map((group) => (
                <div key={group.sectionName}>
                  <p className="sticky top-0 bg-zinc-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {group.sectionName}
                  </p>
                  <ul>
                    {group.items.map((result) => {
                      const index = entries.findIndex(
                        (entry) => entry.kind === "result" && entry.result === result,
                      );
                      return (
                        <li key={`${result.recordId}:${result.fieldName}`}>
                          <button
                            ref={(node) => {
                              if (node !== null && index !== -1) {
                                entryRefs.current.set(index, node);
                              }
                            }}
                            onMouseEnter={() => {
                              if (index !== -1) {
                                setActiveIndex(index);
                              }
                            }}
                            onClick={() => {
                              void onPick(result);
                            }}
                            className={`block w-full px-3 py-2 text-left ${
                              index === activeIndex ? "bg-zinc-800" : ""
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                                {result.title}
                              </span>
                              {!result.exact ? (
                                <span className="shrink-0 rounded-full border border-zinc-700 px-1.5 text-[10px] text-zinc-500">
                                  {t("busqueda.cercano")}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-400">
                              {result.fieldName}:{" "}
                              {result.snippet !== null ? <Snippet text={result.snippet} /> : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        <p className="border-t border-zinc-800 px-3 py-1.5 text-right text-[10px] uppercase tracking-wide text-zinc-600">
          {t("busqueda.atajos")}
        </p>
      </div>
    </div>
  );
}
