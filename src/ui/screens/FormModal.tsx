import { useState } from "react";
import { X } from "lucide-react";
import type { Form } from "../../core/forms";
import { useSectionStore } from "../../stores";

export interface FormModalProps {
  mode: { kind: "create"; sectionId: string } | { kind: "edit"; form: Form };
  onClose: () => void;
}

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400";

/** Modal ligero para crear o editar un formulario (nombre, descripción). */
export function FormModal({ mode, onClose }: FormModalProps) {
  const createForm = useSectionStore((store) => store.createForm);
  const updateForm = useSectionStore((store) => store.updateForm);
  const [name, setName] = useState(mode.kind === "edit" ? mode.form.name : "");
  const [description, setDescription] = useState(
    mode.kind === "edit" ? (mode.form.description ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const descriptionValue = description.trim() === "" ? null : description.trim();
      if (mode.kind === "create") {
        await createForm({
          sectionId: mode.sectionId,
          name,
          description: descriptionValue,
        });
      } else {
        await updateForm(mode.form.id, {
          name,
          description: descriptionValue,
        });
      }
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : String(submitError),
      );
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && name.trim() !== "") {
            void submit();
          }
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {mode.kind === "create" ? "Nuevo formulario" : "Editar formulario"}
          </h2>
          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1 text-zinc-400 transition-colors hover:text-zinc-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          Nombre
          <input
            className={inputClass}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            autoFocus
            required
            maxLength={200}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          Descripción
          <textarea
            className={`${inputClass} min-h-16 resize-y`}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            maxLength={2000}
          />
        </label>

        {error !== null ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || name.trim() === ""}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
