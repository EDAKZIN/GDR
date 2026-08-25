import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, SearchX, X } from "lucide-react";
import type { SearchResult } from "../../core/search";
import { createSearchRepository } from "../../database/repositories";
import { getDb } from "../../database/client";
import { useRecordStore, useSectionStore, useUiStore } from "../../stores";

const searchRepository = createSearchRepository(getDb);
const DEBOUNCE_MS = 250;
const RESULT_LIMIT = 50;

interface ResultGroup {
  sectionName: string;
  items: SearchResult[];
}

/** Renderiza el snippet resaltando los marcadores «coincidencia». */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/«([^»]*)»/u);
  return (
    <span>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="rounded-sm bg-sky-500/20 px-0.5 text-sky-300"
          >
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
  const section = sections.sections.find(
    (candidate) => candidate.id === result.sectionId,
  );
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

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Búsqueda con debounce de ~250 ms (todo el setState ocurre en callbacks).
  useEffect(() => {
    const trimmed = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      if (trimmed === "") {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchRepository
        .search(trimmed, RESULT_LIMIT)
        .then((found) => {
          if (!cancelled) {
            setResults(found);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
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
  }, [query]);

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

  async function onPick(result: SearchResult): Promise<void> {
    onClose();
    try {
      await navigateToResult(result);
    } catch (error) {
      useRecordStore.setState({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const hasQuery = query.trim() !== "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh]"
      onClick={onClose}
    >
      {/* El clic dentro del panel no debe cerrar el overlay. */}
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
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
            }}
            placeholder="Buscar en todos los registros…"
            className="w-full bg-transparent py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {searching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-500" />
          ) : null}
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Cerrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!hasQuery ? (
            <p className="p-6 text-center text-sm text-zinc-600">
              Escribe para buscar en campos indexados de todas las secciones.
            </p>
          ) : !searching && results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <SearchX className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">Sin coincidencias.</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.sectionName}>
                <p className="sticky top-0 bg-zinc-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {group.sectionName}
                </p>
                <ul>
                  {group.items.map((result) => (
                    <li key={`${result.recordId}:${result.fieldName}`}>
                      <button
                        onClick={() => {
                          void onPick(result);
                        }}
                        className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
                      >
                        <span className="block truncate text-sm font-medium text-zinc-100">
                          {result.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-400">
                          {result.fieldName}:{" "}
                          {result.snippet !== null ? (
                            <Snippet text={result.snippet} />
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <p className="border-t border-zinc-800 px-3 py-1.5 text-right text-[10px] uppercase tracking-wide text-zinc-600">
          Enter no necesario · Esc cierra
        </p>
      </div>
    </div>
  );
}
