import { ArrowDownWideNarrow, ArrowUpNarrowWide, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRecordStore } from "../../stores";
import type { RecordOrderBy } from "../../core/records";

const selectClass =
  "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-400";

export function RecordList() {
  const items = useRecordStore((state) => state.items);
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

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select
            aria-label="Ordenar por"
            className={selectClass}
            value={orderBy}
            onChange={(event) => {
              setSorting({ orderBy: event.target.value as RecordOrderBy });
            }}
          >
            <option value="created_at">Creación</option>
            <option value="updated_at">Última modificación</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 transition-colors hover:border-amber-400 hover:text-amber-300"
            onClick={() => {
              setSorting({
                direction: direction === "desc" ? "asc" : "desc",
              });
            }}
            title={direction === "desc" ? "Descendente" : "Ascendente"}
          >
            {direction === "desc" ? (
              <ArrowDownWideNarrow className="h-4 w-4" />
            ) : (
              <ArrowUpNarrowWide className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-amber-500"
              checked={showDeleted}
              onChange={(event) => {
                setShowDeleted(event.target.checked);
              }}
            />
            Papelera
          </label>
          {showDeleted ? null : (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
              onClick={() => {
                openCreate();
              }}
            >
              <Plus className="h-4 w-4" />
              Nuevo registro
            </button>
          )}
        </div>
      </header>

      {error !== null ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">Cargando registros…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 py-10">
          <Trash2 className="h-6 w-6 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            {showDeleted
              ? "La papelera está vacía."
              : "Todavía no hay registros. Crea el primero."}
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {items.map(({ record, title }) => {
            const deleted = record.deletedAt !== null;
            return (
              <li key={record.id}>
                <div
                  className={`group flex items-center justify-between gap-2 rounded-md border px-3 py-2 transition-colors ${
                    deleted
                      ? "border-zinc-800 bg-zinc-900/50 opacity-70"
                      : "cursor-pointer border-zinc-800 bg-zinc-900 hover:border-amber-500/50"
                  }`}
                  onClick={() => {
                    if (!deleted) {
                      void openRecord(record.id);
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium ${
                        deleted ? "text-zinc-500 line-through" : "text-zinc-100"
                      }`}
                    >
                      {title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Creado {new Date(record.createdAt).toLocaleString()}
                      {" · "}
                      Editado {new Date(record.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  {deleted ? (
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-amber-400 hover:text-amber-300"
                      onClick={(event) => {
                        event.stopPropagation();
                        void restoreItem(record.id);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
