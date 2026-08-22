import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  FIELD_OPTIONS_PREFIX,
  FIELD_TYPE_REGISTRY,
  FIELD_TYPES,
  getFieldTypeHandler,
  parseFieldOptions,
  stringifyFieldOptions,
} from "../../core/fields";
import type { CreateFieldInput, Field, FieldType } from "../../core/fields";
import { getDb } from "../../database/client";
import { createFieldsRepository } from "../../database/repositories";
import { useSectionStore } from "../../stores";

const fieldsRepository = createFieldsRepository(getDb);

/** Tipos cuyas opciones se definen desde el constructor. */
const OPTION_TYPES: readonly string[] = ["select", "multiselect", "tags"];

interface EditorState {
  fieldId: string | null;
  name: string;
  descriptionText: string;
  optionsText: string;
  type: FieldType;
  required: boolean;
  searchable: boolean;
}

function emptyEditor(type: FieldType): EditorState {
  return {
    fieldId: null,
    name: "",
    descriptionText: "",
    optionsText: "",
    type,
    required: false,
    searchable: false,
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

/** Etiqueta legible de un tipo (los desconocidos caen a «Texto»). */
function getFieldTypeLabel(type: string): string {
  return getFieldTypeHandler(type).label;
}

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400";
const labelClass = "flex flex-col gap-1 text-xs font-medium text-zinc-400";
const checkboxClass = "h-3.5 w-3.5 accent-sky-500";

export function FormBuilder() {
  const forms = useSectionStore((store) => store.forms);
  const activeFormId = useSectionStore((store) => store.activeFormId);
  const closeBuilder = useSectionStore((store) => store.closeBuilder);

  const form =
    activeFormId !== null
      ? forms.find((candidate) => candidate.id === activeFormId)
      : undefined;

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor("text"));
  const [saving, setSaving] = useState(false);

  /** Recarga con indicador de carga (para acciones del usuario). */
  const refreshFields = useCallback(async () => {
    if (activeFormId === null) {
      return;
    }
    setLoading(true);
    try {
      const loaded = await fieldsRepository.listByForm(activeFormId, {
        includeDisabled: true,
        includeDeleted: true,
      });
      setFields(loaded);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [activeFormId]);

  // Carga inicial: el componente se monta con key={activeFormId}, así que el
  // efecto solo corre al montar. El setState ocurre en callbacks asíncronos.
  useEffect(() => {
    let cancelled = false;
    void fieldsRepository
      .listByForm(activeFormId ?? "", { includeDisabled: true, includeDeleted: true })
      .then((loaded) => {
        if (!cancelled) {
          setFields(loaded);
          setError(null);
          setLoading(false);
        }
        return loaded;
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : String(loadError),
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga única al montar
  }, []);

  const activeFields = useMemo(
    () => fields.filter((field) => field.deletedAt === null),
    [fields],
  );
  const enabledFields = useMemo(
    () => activeFields.filter((field) => field.enabled),
    [activeFields],
  );
  const disabledFields = useMemo(
    () => activeFields.filter((field) => !field.enabled),
    [activeFields],
  );
  const deletedFields = useMemo(
    () => fields.filter((field) => field.deletedAt !== null),
    [fields],
  );

  function startEdit(field: Field): void {
    const { descriptionText, options } = splitDescription(field);
    setEditor({
      fieldId: field.id,
      name: field.name,
      descriptionText,
      optionsText: options.join("\n"),
      type: (FIELD_TYPES as readonly string[]).includes(field.type)
        ? (field.type as FieldType)
        : "text",
      required: field.required,
      searchable: field.searchable,
    });
  }

  async function saveEditor(): Promise<void> {
    if (activeFormId === null || editor.name.trim() === "") {
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
      if (editor.fieldId === null) {
        const input: CreateFieldInput = { ...payload, formId: activeFormId };
        await fieldsRepository.create(input);
      } else {
        await fieldsRepository.update(editor.fieldId, payload);
      }
      setEditor(emptyEditor("text"));
      await refreshFields();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function moveField(field: Field, delta: -1 | 1): Promise<void> {
    const list = activeFields.filter((candidate) => candidate.enabled);
    const index = list.findIndex((candidate) => candidate.id === field.id);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= list.length) {
      return;
    }
    const orderedIds = list.map((candidate) => candidate.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(target, 0, moved);
    try {
      await fieldsRepository.reorder(orderedIds);
      await refreshFields();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : String(moveError));
    }
  }

  async function runFieldAction(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
      await refreshFields();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : String(actionError),
      );
    }
  }

  if (form === undefined) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Pencil className="h-10 w-10 text-zinc-700" />
        <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
          Selecciona un formulario para diseñar sus campos.
        </p>
      </section>
    );
  }

  const isOptionType = OPTION_TYPES.includes(editor.type);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-zinc-100">
            Constructor · {form.name}
          </h2>
          <p className="text-[11px] text-zinc-500">
            Añade, ordena y configura los campos del formulario.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
          onClick={closeBuilder}
          aria-label="Cerrar constructor"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {error !== null ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading && activeFields.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Cargando campos…</p>
        ) : activeFields.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 py-8">
            <Plus className="h-6 w-6 text-zinc-600" />
            <p className="text-sm text-zinc-500">
              Este formulario no tiene campos. Añade el primero abajo.
            </p>
          </div>
        ) : (
          <>
            {enabledFields.map((field, index) => (
              <div
                key={field.id}
                className={`rounded-lg border bg-zinc-900/60 px-3 py-2 ${
                  editor.fieldId === field.id
                    ? "border-sky-500/50"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {field.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
                        {getFieldTypeLabel(field.type)}
                      </span>
                      {field.required ? (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                          Obligatorio
                        </span>
                      ) : null}
                      {field.searchable ? (
                        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                          Buscable
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Subir ${field.name}`}
                    title="Subir"
                    disabled={index === 0}
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                    onClick={() => {
                      void moveField(field, -1);
                    }}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${field.name}`}
                    title="Bajar"
                    disabled={index === enabledFields.length - 1}
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                    onClick={() => {
                      void moveField(field, 1);
                    }}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Editar ${field.name}`}
                    title="Editar"
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-sky-300"
                    onClick={() => {
                      startEdit(field);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Deshabilitar ${field.name}`}
                    title="Deshabilitar"
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
                    onClick={() => {
                      void runFieldAction(() => fieldsRepository.disable(field.id));
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${field.name}`}
                    title="Eliminar"
                    className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => {
                      void runFieldAction(() => fieldsRepository.softDelete(field.id));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {disabledFields.length > 0 ? (
              <>
                <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Deshabilitados
                </p>
                {disabledFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 opacity-60"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                      {field.name}
                      {" · "}
                      {getFieldTypeLabel(field.type)}
                    </span>
                    <button
                      type="button"
                      title="Habilitar"
                      aria-label={`Habilitar ${field.name}`}
                      className="rounded-md p-1 text-zinc-500 transition-colors hover:text-sky-300"
                      onClick={() => {
                        void runFieldAction(() => fieldsRepository.enable(field.id));
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      aria-label={`Eliminar ${field.name}`}
                      className="rounded-md p-1 text-zinc-500 transition-colors hover:text-rose-300"
                      onClick={() => {
                        void runFieldAction(() =>
                          fieldsRepository.softDelete(field.id),
                        );
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </>
            ) : null}

            {deletedFields.length > 0 ? (
              <>
                <p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Papelera de campos
                </p>
                {deletedFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-800 px-3 py-1.5 opacity-60"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 line-through">
                      {field.name}
                    </span>
                    <button
                      type="button"
                      title="Restaurar"
                      aria-label={`Restaurar ${field.name}`}
                      className="shrink-0 rounded-md border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-300 transition-colors hover:border-sky-400 hover:text-sky-300"
                      onClick={() => {
                        void runFieldAction(() => fieldsRepository.restore(field.id));
                      }}
                    >
                      Restaurar
                    </button>
                    <button
                      type="button"
                      title="Eliminar definitivamente"
                      aria-label={`Eliminar definitivamente ${field.name}`}
                      className="shrink-0 rounded-md border border-rose-500/40 px-1.5 py-0.5 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/10"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar el campo «${field.name}» definitivamente? Sus valores guardados se perderán.`,
                          )
                        ) {
                          void runFieldAction(() =>
                            fieldsRepository.hardDelete(field.id),
                          );
                        }
                      }}
                    >
                      Borrar
                    </button>
                  </div>
                ))}
              </>
            ) : null}
          </>
        )}
      </div>

      <form
        className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && editor.name.trim() !== "") {
            void saveEditor();
          }
        }}
      >
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {editor.fieldId === null ? "Añadir campo" : `Editando campo`}
          </h3>
          {editor.fieldId !== null ? (
            <button
              type="button"
              className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-200 hover:underline"
              onClick={() => {
                setEditor(emptyEditor("text"));
              }}
            >
              Cancelar edición
            </button>
          ) : null}
        </header>

        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelClass}>
            Nombre
            <input
              className={inputClass}
              value={editor.name}
              onChange={(event) => {
                setEditor({ ...editor, name: event.target.value });
              }}
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
                setEditor({
                  ...editor,
                  type: event.target.value as FieldType,
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
              <input
                type="checkbox"
                className={checkboxClass}
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
                className={checkboxClass}
                checked={editor.searchable}
                onChange={(event) => {
                  setEditor({ ...editor, searchable: event.target.checked });
                }}
              />
              Buscable
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || editor.name.trim() === ""}
          >
            <Plus className="h-3.5 w-3.5" />
            {editor.fieldId === null
              ? saving
                ? "Añadiendo…"
                : "Añadir campo"
              : saving
                ? "Guardando…"
                : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}


