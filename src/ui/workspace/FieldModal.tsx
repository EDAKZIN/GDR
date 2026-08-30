import { useEffect, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import {
  FIELD_OPTIONS_PREFIX,
  FIELD_TYPES,
  FIELD_TYPE_REGISTRY,
  parseFieldOptions,
  stringifyFieldOptions,
} from "../../core/fields";
import type { CreateFieldInput, Field, FieldType } from "../../core/fields";
import { useT } from "../../i18n";
import { getDb } from "../../database/client";
import { createFieldsRepository } from "../../database/repositories";
import { ReorderContainer, ReorderItem } from "../components/LongPressReorder";
import { useLongPressReorder } from "../components/useLongPressReorder";

const fieldsRepository = createFieldsRepository(getDb);

/** Tipos cuyas opciones se definen desde el constructor. */
const OPTION_TYPES: readonly string[] = ["select", "multiselect", "tags"];

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-400";

interface EditorState {
  name: string;
  descriptionText: string;
  options: string[];
  type: FieldType;
  required: boolean;
  searchable: boolean;
}

function emptyEditor(type: FieldType): EditorState {
  return {
    name: "",
    descriptionText: "",
    options: [],
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
  options: readonly string[],
  type: FieldType,
): string | null {
  const text = descriptionText.trim();
  if (!OPTION_TYPES.includes(type)) {
    return text === "" ? null : text;
  }
  const values = options.map((option) => option.trim()).filter((option) => option !== "");
  if (values.length === 0) {
    return text === "" ? null : text;
  }
  const serialized = stringifyFieldOptions(values.map((value) => ({ value, label: value })));
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
  const { t } = useT();
  const [editor, setEditor] = useState<EditorState>(() => {
    if (field === null) {
      return emptyEditor("text");
    }
    const { descriptionText, options } = splitDescription(field);
    return {
      name: field.name,
      descriptionText,
      options,
      type: (FIELD_TYPES as readonly string[]).includes(field.type)
        ? (field.type as FieldType)
        : "text",
      required: field.required,
      searchable: field.searchable,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reordenación por arrastre de las opciones (estado local del modal; el
  // orden se persiste con las opciones al guardar).
  const optionIds = editor.options.map((_option, index) => String(index));
  const optionsReorder = useLongPressReorder({
    orderedIds: optionIds,
    onReorder: (orderedOptionIds) => {
      setEditor((current) => ({
        ...current,
        options: orderedOptionIds.map((id) => current.options[Number(id)]),
      }));
    },
  });

  function updateOption(index: number, value: string): void {
    setEditor((current) => ({
      ...current,
      options: current.options.map((option, position) => (position === index ? value : option)),
    }));
  }

  function removeOption(index: number): void {
    setEditor((current) => ({
      ...current,
      options: current.options.filter((_option, position) => position !== index),
    }));
  }

  function addOption(): void {
    setEditor((current) => ({ ...current, options: [...current.options, ""] }));
  }

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
        description: buildDescription(editor.descriptionText, editor.options, editor.type),
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
      setError(submitError instanceof Error ? submitError.message : String(submitError));
      setSaving(false);
    }
  }

  const isOptionType = OPTION_TYPES.includes(editor.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={field === null ? t("plantilla.anadirCampo") : t("plantilla.editarCampo")}
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
            {field === null ? t("plantilla.anadirCampo") : t("plantilla.editarCampo")}
          </h2>
          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1 text-zinc-400 transition-colors hover:text-zinc-100"
            onClick={onClose}
            aria-label={t("comun.cerrar")}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("comun.nombre")}
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
            {t("plantilla.tipo")}
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
          {t("comun.descripcion")}
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
          <div className={labelClass}>
            {t("plantilla.opciones")}
            <ReorderContainer controller={optionsReorder} className="flex flex-col gap-1.5">
              {optionsReorder.order.map((optionId) => {
                const optionIndex = Number(optionId);
                const isDragging = optionsReorder.draggingId === optionId;
                return (
                  <ReorderItem
                    key={optionId}
                    controller={optionsReorder}
                    id={optionId}
                    className={`flex items-center gap-1.5 rounded-md border bg-zinc-900/60 pl-1 pr-2 transition-colors ${
                      isDragging
                        ? "z-10 scale-[1.02] border-sky-400/70 shadow-lg shadow-sky-500/10 ring-2 ring-sky-400/40"
                        : optionsReorder.draggingId !== null
                          ? "border-zinc-800 opacity-60"
                          : "border-zinc-800"
                    }`}
                  >
                    <button
                      type="button"
                      {...optionsReorder.getGripProps(optionId)}
                      aria-label={t("plantilla.opcionReordenarAria", { n: optionIndex + 1 })}
                      className={`shrink-0 cursor-grab rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-sky-300 ${
                        isDragging ? "cursor-grabbing text-sky-300" : ""
                      }`}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <input
                      value={editor.options[optionIndex] ?? ""}
                      onChange={(event) => {
                        updateOption(optionIndex, event.target.value);
                      }}
                      placeholder={t("plantilla.opcionPlaceholder", { n: optionIndex + 1 })}
                      maxLength={200}
                      className="min-w-0 flex-1 bg-transparent py-1.5 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      aria-label={t("plantilla.eliminarOpcionAria", { n: optionIndex + 1 })}
                      className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-300"
                      onClick={() => {
                        removeOption(optionIndex);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </ReorderItem>
                );
              })}
            </ReorderContainer>
            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 self-start rounded-md border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:border-sky-400 hover:text-sky-300"
            >
              <Plus className="h-3 w-3" />
              {t("plantilla.anadirOpcion")}
            </button>
          </div>
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
            {t("comun.obligatorio")}
          </label>
          <label
            className={`inline-flex items-center gap-1.5 text-xs ${
              editor.type === "password" ? "cursor-not-allowed text-zinc-600" : "cursor-pointer text-zinc-400"
            }`}
            title={editor.type === "password" ? "Las contraseñas nunca se indexan por seguridad" : undefined}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              checked={editor.searchable}
              disabled={editor.type === "password"}
              onChange={(event) => {
                setEditor({ ...editor, searchable: event.target.checked });
              }}
            />
            {t("comun.buscable")}
            {editor.type === "password" && (
              <span className="text-[10px] text-zinc-600">(no indexable)</span>
            )}
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
            {t("comun.cancelar")}
          </button>
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || editor.name.trim() === ""}
          >
            {field === null
              ? saving
                ? t("plantilla.anadiendo")
                : t("plantilla.anadirCampo")
              : saving
                ? t("comun.guardando")
                : t("comun.guardarCambios")}
          </button>
        </footer>
      </form>
    </div>
  );
}
