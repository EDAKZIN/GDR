import { useState } from "react";
import { X } from "lucide-react";
import type { Form } from "../../core/forms";
import { getDb } from "../../database/client";
import { createFieldsRepository } from "../../database/repositories";
import { useSectionStore } from "../../stores";
import {
  FORM_TEMPLATES,
  templateFieldDescription,
} from "../menu/formTemplates";
import { showToast } from "../menu/toastStore";

const fieldsRepository = createFieldsRepository(getDb);

export interface FormModalProps {
  mode:
    | { kind: "create"; sectionId: string; sectionName?: string }
    | { kind: "edit"; form: Form };
  onClose: () => void;
}

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400";

function templateOptionClass(active: boolean): string {
  return `flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors duration-150 ${
    active
      ? "border-sky-500/40 bg-sky-500/10"
      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60"
  }`;
}

/**
 * Modal para crear o editar un formulario. En creación permite elegir una
 * PLANTILLA INICIAL (Vacía, Cuentas, Herramienta o Idea): se crea el formulario
 * y sus campos de golpe con posiciones 0..n. Los campos siguen editables
 * después en la pestaña Plantilla.
 */
export function FormModal({ mode, onClose }: FormModalProps) {
  const createForm = useSectionStore((store) => store.createForm);
  const updateForm = useSectionStore((store) => store.updateForm);
  const [name, setName] = useState(mode.kind === "edit" ? mode.form.name : "");
  const [description, setDescription] = useState(
    mode.kind === "edit" ? (mode.form.description ?? "") : "",
  );
  const [templateId, setTemplateId] = useState<string>(
    FORM_TEMPLATES[0]?.id ?? "empty",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const descriptionValue = description.trim() === "" ? null : description.trim();
      if (mode.kind === "create") {
        const created = await createForm({
          sectionId: mode.sectionId,
          name,
          description: descriptionValue,
        });
        // Alta de los campos de la plantilla elegida, en posiciones 0..n.
        const template =
          FORM_TEMPLATES.find((candidate) => candidate.id === templateId) ??
          FORM_TEMPLATES[0];
        const fieldCount = template.fields.length;
        if (fieldCount > 0) {
          for (const [index, spec] of template.fields.entries()) {
            await fieldsRepository.create({
              formId: created.id,
              name: spec.name,
              type: spec.type,
              required: spec.required ?? false,
              searchable: false,
              position: index,
              description: templateFieldDescription(spec),
            });
          }
        }
        showToast(
          fieldCount > 0
            ? `Formulario «${created.name}» creado con ${String(fieldCount)} campos`
            : `Formulario «${created.name}» creado`,
        );
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

        {mode.kind === "create" && mode.sectionName !== undefined ? (
          <p className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500">
            En la sección{" "}
            <span className="font-medium text-sky-300">{mode.sectionName}</span>
          </p>
        ) : null}

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

        {mode.kind === "create" ? (
          <fieldset className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
            Plantilla inicial
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {FORM_TEMPLATES.map((template) => (
                <label
                  key={template.id}
                  className={templateOptionClass(templateId === template.id)}
                >
                  <input
                    type="radio"
                    name="form-template"
                    className="mt-0.5 shrink-0 accent-sky-500"
                    checked={templateId === template.id}
                    onChange={() => {
                      setTemplateId(template.id);
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-zinc-200">
                      {template.label}
                    </span>
                    <span className="block truncate text-[10px] font-normal text-zinc-500">
                      {template.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-[10px] font-normal leading-relaxed text-zinc-600">
              Los campos se crean al instante y luego puedes editarlos en la
              pestaña Plantilla.
            </p>
          </fieldset>
        ) : null}

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
