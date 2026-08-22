import { Pencil, Trash2, X } from "lucide-react";
import { getFieldTypeHandler } from "../../core/fields";
import type { Field } from "../../core/fields";
import { useRecordStore } from "../../stores";

function scalarText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }
  return null;
}

function formatFieldValue(field: Field, value: unknown): string {
  if (field.type === "password") {
    return typeof value === "string" && value !== "" ? "••••••••" : "—";
  }
  if (value === null || value === undefined) {
    return "—";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map(scalarText)
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  const text = scalarText(value);
  if (text === null) {
    // Objetos complejos sin representación plana.
    return "—";
  }
  if (field.type === "date" || field.type === "datetime") {
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      return field.type === "date"
        ? new Date(parsed).toLocaleDateString()
        : new Date(parsed).toLocaleString();
    }
  }
  const handler = getFieldTypeHandler(field.type);
  return handler.isEmpty(value) ? "—" : text;
}

function ValueRow({ field, value }: { field: Field; value: unknown }) {
  const formatted = formatFieldValue(field, value);
  const empty = formatted === "—";
  return (
    <div className="grid grid-cols-[minmax(8rem,10rem)_1fr] gap-3 py-2 text-sm">
      <span className="text-zinc-500">{field.name}</span>
      {field.type === "image" && !empty && typeof value === "string" ? (
        <img
          src={value}
          alt={field.name}
          className="max-h-32 rounded-md border border-zinc-700 object-contain"
        />
      ) : field.type === "url" && !empty && typeof value === "string" ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="break-all text-amber-300 underline decoration-amber-500/40 hover:decoration-amber-300"
        >
          {formatted}
        </a>
      ) : (
        <span className={`break-all ${empty ? "text-zinc-600" : "text-zinc-100"}`}>
          {formatted}
        </span>
      )}
    </div>
  );
}

export function RecordDetail() {
  const detail = useRecordStore((state) => state.activeDetail);
  const fields = useRecordStore((state) => state.fields);
  const startEditing = useRecordStore((state) => state.startEditing);
  const deleteActive = useRecordStore((state) => state.deleteActive);
  const closeActive = useRecordStore((state) => state.closeActive);

  if (detail === null) {
    return null;
  }

  const valuesByField = new Map(detail.values.map((entry) => [entry.fieldId, entry.value]));

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="truncate text-base font-semibold text-zinc-100">
          Detalle del registro
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500"
            onClick={() => {
              startEditing();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
            onClick={() => {
              void deleteActive();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
            onClick={() => {
              closeActive();
            }}
            aria-label="Cerrar detalle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 divide-y divide-zinc-800 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/60 px-4">
        {fields.map((field) => (
          <ValueRow key={field.id} field={field} value={valuesByField.get(field.id)} />
        ))}
        {fields.length === 0 ? (
          <p className="py-6 text-sm text-zinc-500">
            Este formulario no tiene campos definidos.
          </p>
        ) : null}
      </div>
    </section>
  );
}
