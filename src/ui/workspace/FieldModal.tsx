import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  FIELD_OPTIONS_PREFIX,
  FIELD_TYPES,
  FIELD_TYPE_REGISTRY,
  parseFieldOptions,
  stringifyFieldOptions,
} from "../../core/fields";
import type { CreateFieldInput, Field, FieldType } from "../../core/fields";
import { getDb } from "../../database/client";
import { createFieldsRepository } from "../../database/repositories";

const fieldsRepository = createFieldsRepository(getDb);

/** Tipos cuyas opciones se definen desde el constructor. */
const OPTION_TYPES: readonly string[] = ["select", "multiselect", "tags"];

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-400";

interface EditorState {
  name: string;
  descriptionText: string;
  optionsText: string;
  type: FieldType;
  required: boolean;
  searchable: boolean;
}

function emptyEditor(type: FieldType): EditorState {
  return {
    name: "",
    descriptionText: "",
    optionsText: "",
    type,
    required: false,
    // Los campos nuevos son buscables por defecto (salvo contraseñas): el
    // índice de búsqueda global solo cubre campos con searchable = 1.
    searchable: type !== "password",
  };
}

/** Separa la descripción legible de las opciones embebidas «options:[…]». */
function splitDescription(field: Pick<Field, "description">): {
  descriptionText: string;
  options: string[];
} {
  const description = field.description ?? "";
  const marker = description.indexOf(FIELD_OPTIONS_PREFIX);
  if (marker === -1) {
    return { descriptionText: description.trim(), options: [] };
  }
  const descriptionText = description.slice(0, marker).trim();
  const options = parseFieldOptions(field).map((option) => option.value);
  return { descriptionText, options };
}

function buildDescription(
  descriptionText: string,
  optionsText: string,
  type: FieldType,
): string | null {
  const text = descriptionText.trim();
  if (!OPTION_TYPES.includes(type)) {
    return text === "" ? null : text;
  }
  const values = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (values.length === 0) {
    return text === "" ? null : text;
  }
  const serialized = stringifyFieldOptions(
    values.map((value) => ({ value, label: value })),
  );
  return text === "" ? serialized : `${text} ${serialized}`;
}

export interface FieldModalProps {
  formId: string;
  /** null → crear; definido → editar precargado. */
  field: Field | null;
  onSaved: () => void;
  onClose: () => void;
}

/** Modal para crear o editar un campo de la plantilla del formulario. */
export function FieldModal({ formId, field, onSaved, onClose }: FieldModalProps) {
  const [editor, setEditor] = useState<EditorState>(() => {
    if (field === null) {
      return emptyEditor("text");
    }
    const { descriptionText, options } = splitDescription(field);
    return {
      name: field.name,
      descriptionText,
      optionsText: options.join("\n"),
      type: (FIELD_TYPES as readonly string[]).includes(field.type)
        ? (field.type as FieldType)
        : "text",
      required: field.required,
      searchable: field.searchable,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saving) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [saving, onClose]);

  async function submit(): Promise<void> {
    if (editor.name.trim() === "") {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: editor.name.trim(),
        description: buildDescription(
          editor.descriptionText,
          editor.optionsText,
          editor.type,
        ),
        type: editor.type,
        required: editor.required,
        searchable: editor.searchable,
      };
      if (field === null) {
        const input: CreateFieldInput = { ...payload, formId };
        await fieldsRepository.create(input);
      } else {
        await fieldsRepository.update(field.id, payload);
      }
      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : String(submitError),
      );
      setSaving(false);
    }
  }

  const isOptionType = OPTION_TYPES.includes(editor.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={field === null ? "Añadir campo" : "Editar campo"}
        className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving) {
            void submit();
          }
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {field === null ? "Añadir campo" : "Editar campo"}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Nombre
            <input
              className={inputClass}
              value={editor.name}
              onChange={(event) => {
                setEditor({ ...editor, name: event.target.value });
              }}
              autoFocus
              maxLength={200}
              required
            />
          </label>
          <label className={labelClass}>
            Tipo
            <select
              className={inputClass}
              value={editor.type}
              onChange={(event) => {
                const type = event.target.value as FieldType;
                setEditor({
                  ...editor,
                  type,
                  // Las contraseñas nunca se indexan.
                  searchable: type === "password" ? false : editor.searchable,
                });
              }}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_REGISTRY[type].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Descripción
          <textarea
            className={`${inputClass} min-h-12 resize-y`}
            value={editor.descriptionText}
            onChange={(event) => {
              setEditor({ ...editor, descriptionText: event.target.value });
            }}
            maxLength={2000}
          />
        </label>

        {isOptionType ? (
          <label className={labelClass}>
            Opciones (una por línea)
            <textarea
              className={`${inputClass} min-h-16 resize-y font-mono text-xs`}
              value={editor.optionsText}
              onChange={(event) => {
                setEditor({ ...editor, optionsText: event.target.value });
              }}
              placeholder={"alta\nmedia\nbaja"}
            />
          </label>
        ) : null}

        <div className="flex items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-sky-500"
              checked={editor.required}
              onChange={(event) => {
                setEditor({ ...editor, required: event.target.checked });
              }}
            />
            Obligatorio
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-sky-500"
              checked={editor.searchable}
              onChange={(event) => {
                setEditor({ ...editor, searchable: event.target.checked });
              }}
            />
            Buscable
          </label>
        </div>

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
            disabled={saving || editor.name.trim() === ""}
          >
            {field === null
              ? saving
                ? "Añadiendo…"
                : "Añadir campo"
              : saving
                ? "Guardando…"
                : "Guardar cambios"}
          </button>
        </footer>
      </form>
    </div>
  );
}
