import { Save, X } from "lucide-react";
import { FieldRenderer } from "../forms/fields";
import { useRecordStore } from "../../stores";

export function RecordEditor() {
  const mode = useRecordStore((state) => state.activeMode);
  const fields = useRecordStore((state) => state.fields);
  const activeId = useRecordStore((state) => state.activeId);
  const draft = useRecordStore((state) => state.draft);
  const errors = useRecordStore((state) => state.errors);
  const saving = useRecordStore((state) => state.saving);
  const error = useRecordStore((state) => state.error);
  const setDraftValue = useRecordStore((state) => state.setDraftValue);
  const saveActive = useRecordStore((state) => state.saveActive);
  const openRecord = useRecordStore((state) => state.openRecord);
  const closeActive = useRecordStore((state) => state.closeActive);

  if (mode !== "edit" && mode !== "create") {
    return null;
  }

  /** Cancelar: en edición se vuelve a la vista del registro; en creación se cierra. */
  function cancel(): void {
    if (mode === "edit" && activeId !== null) {
      void openRecord(activeId);
      return;
    }
    closeActive();
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-100">
          {mode === "create" ? "Nuevo registro" : "Editar registro"}
        </h2>
        <button
          type="button"
          className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
          onClick={cancel}
          aria-label="Cancelar"
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {error !== null ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 pr-2">
        {fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={draft[field.id]}
            error={errors[field.id] ?? null}
            onChange={(value) => {
              setDraftValue(field.id, value);
            }}
            disabled={saving}
          />
        ))}
        {fields.length === 0 ? (
          <p className="py-6 text-sm text-zinc-500">
            Este formulario no tiene campos definidos.
          </p>
        ) : null}
      </div>

      {Object.keys(errors).length > 0 ? (
        <p className="text-xs font-medium text-rose-400">
          Revisa los errores antes de guardar.
        </p>
      ) : null}

      <footer className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-50"
          onClick={cancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            void saveActive();
          }}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </footer>
    </section>
  );
}
