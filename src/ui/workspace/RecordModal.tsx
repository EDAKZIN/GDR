import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Save, Trash2, X } from "lucide-react";
import type { Field } from "../../core/fields";
import { useRecordStore } from "../../stores";
import { FieldRenderer } from "../forms/fields";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatValue } from "./recordValues";

function ValueRow({
  field,
  value,
  revealed,
  onToggleReveal,
}: {
  field: Field;
  value: unknown;
  revealed: boolean;
  onToggleReveal: () => void;
}) {
  const formatted = formatValue(field, value);
  const empty = formatted === "—";

  let content;
  if (field.type === "password" && !empty) {
    content = (
      <span className="flex items-center gap-2">
        <span className="break-all font-mono text-sm text-zinc-100">
          {revealed ? String(value) : formatted}
        </span>
        <button
          type="button"
          aria-label={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
          title={revealed ? "Ocultar" : "Mostrar"}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
          onClick={onToggleReveal}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </span>
    );
  } else if (field.type === "image" && !empty && typeof value === "string") {
    content = (
      <img
        src={value}
        alt={field.name}
        className="max-h-32 rounded-md border border-zinc-700 object-contain"
      />
    );
  } else if (field.type === "url" && !empty && typeof value === "string") {
    content = (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="break-all text-sky-300 underline decoration-sky-500/40 hover:decoration-sky-300"
      >
        {formatted}
      </a>
    );
  } else {
    content = (
      <span className={`break-all text-sm ${empty ? "text-zinc-600" : "text-zinc-100"}`}>
        {formatted}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(8rem,10rem)_1fr] gap-3 py-2">
      <span className="pt-0.5 text-xs font-medium text-zinc-500">{field.name}</span>
      {content}
    </div>
  );
}

/**
 * Modal grande (casi pantalla completa) del registro activo según el modo de
 * useRecordStore: vista con formato por tipo, o creación/edición con
 * FieldRenderer y validación required. Esc lo cierra.
 */
export function RecordModal() {
  const mode = useRecordStore((state) => state.activeMode);
  const fields = useRecordStore((state) => state.fields);
  const activeId = useRecordStore((state) => state.activeId);
  const activeDetail = useRecordStore((state) => state.activeDetail);
  const draft = useRecordStore((state) => state.draft);
  const errors = useRecordStore((state) => state.errors);
  const saving = useRecordStore((state) => state.saving);
  const error = useRecordStore((state) => state.error);
  const setDraftValue = useRecordStore((state) => state.setDraftValue);
  const saveActive = useRecordStore((state) => state.saveActive);
  const startEditing = useRecordStore((state) => state.startEditing);
  const openRecord = useRecordStore((state) => state.openRecord);
  const closeActive = useRecordStore((state) => state.closeActive);
  const deleteActive = useRecordStore((state) => state.deleteActive);

  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const open = mode !== "closed";

  useEffect(() => {
    if (!open || saving || confirmingDelete) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeActive();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, saving, confirmingDelete, closeActive]);

  if (!open) {
    return null;
  }

  /** Cancelar: en edición se vuelve a la vista; en creación se cierra. */
  function cancel(): void {
    if (mode === "edit" && activeId !== null) {
      void openRecord(activeId);
      return;
    }
    closeActive();
  }

  function toggleReveal(fieldId: string): void {
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  }

  const editing = mode === "create" || mode === "edit";
  const valuesByField =
    activeDetail !== null
      ? new Map(activeDetail.values.map((entry) => [entry.fieldId, entry.value]))
      : new Map<string, unknown>();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "view" ? "Detalle del registro" : "Edición de registro"
        }
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-5 py-3.5">
          <h2 className="truncate text-base font-semibold text-zinc-100">
            {mode === "create"
              ? "Nuevo registro"
              : mode === "edit"
                ? "Editar registro"
                : "Detalle del registro"}
          </h2>

          {!editing ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
                onClick={startEditing}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
                onClick={() => {
                  setConfirmingDelete(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-50"
            onClick={() => {
              if (editing) {
                cancel();
              } else {
                closeActive();
              }
            }}
            aria-label="Cerrar"
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error !== null ? (
            <p className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          ) : null}

          {editing ? (
            <div className="space-y-4">
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
                  Añade campos a esta plantilla para empezar a llenar registros.
                </p>
              ) : null}
              {Object.keys(errors).length > 0 ? (
                <p className="text-xs font-medium text-rose-400">
                  Revisa los errores antes de guardar.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-1">
              {fields.map((field) => (
                <ValueRow
                  key={field.id}
                  field={field}
                  value={valuesByField.get(field.id)}
                  revealed={revealed.has(field.id)}
                  onToggleReveal={() => {
                    toggleReveal(field.id);
                  }}
                />
              ))}
              {fields.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  Añade campos a esta plantilla para empezar a llenar registros.
                </p>
              ) : null}
            </div>
          )}
        </div>

        {editing ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3.5">
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
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                void saveActive();
              }}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </footer>
        ) : null}
      </section>

      {confirmingDelete ? (
        <ConfirmModal
          title="Eliminar registro"
          message="El registro pasará a la papelera de este formulario. Podrás restaurarlo desde ahí."
          confirmLabel="Eliminar"
          onConfirm={() => deleteActive()}
          onClose={() => {
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </div>
  );
}
