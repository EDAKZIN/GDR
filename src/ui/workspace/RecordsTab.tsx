import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  LayoutList,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { RecordOrderBy } from "../../core/records";
import { useRecordStore } from "../../stores";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatValue, valueSearchText } from "./recordValues";

const selectClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-sky-400";

/**
 * TAB «Registros»: lista filtrable por texto y ordenable, con creación en
 * modal. Cada tarjeta muestra los primeros valores clave de la plantilla.
 */
export function RecordsTab({
  onGoToTemplate,
}: {
  /** Cambia a la pestaña de plantilla (cuando no hay campos). */
  onGoToTemplate: () => void;
}) {
  const items = useRecordStore((state) => state.items);
  const fields = useRecordStore((state) => state.fields);
  const orderBy = useRecordStore((state) => state.orderBy);
  const direction = useRecordStore((state) => state.direction);
  const showDeleted = useRecordStore((state) => state.showDeleted);
  const loading = useRecordStore((state) => state.loading);
  const error = useRecordStore((state) => state.error);
  const setSorting = useRecordStore((state) => state.setSorting);
  const setShowDeleted = useRecordStore((state) => state.setShowDeleted);
  const openCreate = useRecordStore((state) => state.openCreate);
  const openRecord = useRecordStore((state) => state.openRecord);
  const restoreItem = useRecordStore((state) => state.restoreItem);
  const deleteItem = useRecordStore((state) => state.deleteItem);

  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Campos habilitados con valor: se muestran los 3 primeros como claves.
  const previewFields = useMemo(
    () => fields.slice(0, 3),
    [fields],
  );

  const valuesByRecord = useMemo(() => {
    const map = new Map<string, Map<string, unknown>>();
    for (const { record, values } of items) {
      map.set(
        record.id,
        new Map(values.map((entry) => [entry.fieldId, entry.value])),
      );
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") {
      return items;
    }
    return items.filter(({ title, values }) => {
      if (title.toLowerCase().includes(needle)) {
        return true;
      }
      return values.some((entry) =>
        valueSearchText(entry.value).toLowerCase().includes(needle),
      );
    });
  }, [items, query]);

  const hasFields = fields.length > 0;
  const isEmpty = !loading && items.length === 0;

  function preview(recordId: string): string[] {
    const values = valuesByRecord.get(recordId);
    if (values === undefined) {
      return [];
    }
    const parts: string[] = [];
    for (const field of previewFields) {
      const formatted = formatValue(field, values.get(field.id));
      if (formatted !== "—") {
        parts.push(`${field.name}: ${formatted}`);
      }
      if (parts.length === 3) {
        break;
      }
    }
    return parts;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label className="relative flex min-w-0 flex-1 items-center sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-zinc-600" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Buscar registros…"
              aria-label="Buscar registros"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-7 pr-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400"
            />
          </label>
          <select
            aria-label="Ordenar por"
            className={selectClass}
            value={orderBy}
            onChange={(event) => {
              setSorting({ orderBy: event.target.value as RecordOrderBy });
            }}
          >
            <option value="created_at">Creación</option>
            <option value="updated_at">Modificación</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 transition-colors hover:border-sky-400 hover:text-sky-300"
            onClick={() => {
              setSorting({
                direction: direction === "desc" ? "asc" : "desc",
              });
            }}
            title={direction === "desc" ? "Descendente" : "Ascendente"}
            aria-label={direction === "desc" ? "Descendente" : "Ascendente"}
          >
            {direction === "desc" ? (
              <ArrowDownWideNarrow className="h-4 w-4" />
            ) : (
              <ArrowUpNarrowWide className="h-4 w-4" />
            )}
          </button>
          <label className="inline-flex cursor-pointer shrink-0 items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-sky-500"
              checked={showDeleted}
              onChange={(event) => {
                setShowDeleted(event.target.checked);
              }}
            />
            Papelera
          </label>
        </div>
        {showDeleted || !hasFields ? null : (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Nuevo registro
          </button>
        )}
      </header>

      {error !== null ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      {!hasFields && !showDeleted ? (
        /* Sin campos en la plantilla todavía. */
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center">
          <LayoutList className="h-10 w-10 text-zinc-700" />
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            Añade campos a esta plantilla para empezar a llenar registros.
          </p>
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
            onClick={onGoToTemplate}
          >
            <Plus className="h-4 w-4" />
            Ir a la pestaña Plantilla
          </button>
        </div>
      ) : loading && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Cargando registros…
        </p>
      ) : isEmpty ? (
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center">
          <LayoutList className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {showDeleted
              ? "La papelera está vacía."
              : "Esta plantilla todavía no tiene registros. Crea el primero."}
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {filtered.map(({ record, title }) => {
            const deleted = record.deletedAt !== null;
            const previews = deleted ? [] : preview(record.id);
            return (
              <li key={record.id}>
                <div
                  role={deleted ? undefined : "button"}
                  tabIndex={deleted ? undefined : 0}
                  className={`group rounded-lg border px-3 py-2 transition-colors ${
                    deleted
                      ? "border-zinc-800 bg-zinc-900/50 opacity-70"
                      : "cursor-pointer border-zinc-800 bg-zinc-900/60 hover:border-sky-500/50 hover:bg-zinc-900"
                  }`}
                  onClick={() => {
                    if (!deleted) {
                      void openRecord(record.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!deleted && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      void openRecord(record.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`min-w-0 truncate text-sm font-medium ${
                        deleted ? "text-zinc-500 line-through" : "text-zinc-100"
                      }`}
                    >
                      {title}
                    </p>
                    {deleted ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Restaurar ${title}`}
                          title="Restaurar"
                          className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-sky-400 hover:text-sky-300"
                          onClick={(event) => {
                            event.stopPropagation();
                            void restoreItem(record.id);
                          }}
                        >
                          Restaurar
                        </button>
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label={`Eliminar ${title}`}
                          title="Eliminar registro"
                          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteId(record.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </div>

                  {previews.length > 0 ? (
                    <p className="mt-1 truncate text-[11px] leading-relaxed text-zinc-500">
                      {previews.join("  ·  ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Creado {new Date(record.createdAt).toLocaleString()}
                    </p>
                  )}

                  {deleted ? (
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Eliminado · creado {new Date(record.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="py-6 text-center text-sm text-zinc-500">
              Ningún registro coincide con «{query.trim()}».
            </li>
          ) : null}
        </ul>
      )}

      {deleteId !== null ? (
        <ConfirmModal
          title="Eliminar registro"
          message="El registro pasará a la papelera de este formulario. Podrás restaurarlo desde ahí."
          confirmLabel="Eliminar"
          onConfirm={() => deleteItem(deleteId)}
          onClose={() => {
            setDeleteId(null);
          }}
        />
      ) : null}
    </section>
  );
}
