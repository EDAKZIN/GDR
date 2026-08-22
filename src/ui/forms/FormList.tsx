import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  LayoutList,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import type { Form } from "../../core/forms";
import { useSectionStore } from "../../stores";


type ModalState =
  | { mode: "create" }
  | { mode: "edit"; form: Form }
  | null;

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400";

function FormFormModal({
  state,
  sectionId,
  onClose,
}: {
  state: NonNullable<ModalState>;
  sectionId: string;
  onClose: () => void;
}) {
  const createForm = useSectionStore((store) => store.createForm);
  const updateForm = useSectionStore((store) => store.updateForm);
  const [name, setName] = useState(state.mode === "edit" ? state.form.name : "");
  const [description, setDescription] = useState(
    state.mode === "edit" ? (state.form.description ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const descriptionValue =
        description.trim() === "" ? null : description.trim();
      if (state.mode === "create") {
        await createForm({
          sectionId,
          name,
          description: descriptionValue,
        });
      } else {
        await updateForm(state.form.id, {
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
            {state.mode === "create" ? "Nuevo formulario" : "Editar formulario"}
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
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || name.trim() === ""}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function FormRowMenu({
  form,
  onClose,
  onEdit,
}: {
  form: Form;
  onClose: () => void;
  onEdit: (modal: ModalState) => void;
}) {
  const enableForm = useSectionStore((store) => store.enableForm);
  const disableForm = useSectionStore((store) => store.disableForm);
  const softDeleteForm = useSectionStore((store) => store.softDeleteForm);
  const moveForm = useSectionStore((store) => store.moveForm);
  const forms = useSectionStore((store) => store.forms);

  const isFirst = forms[0]?.id === form.id;
  const isLast = forms[forms.length - 1]?.id === form.id;

  interface ActionItem {
    label: string;
    icon: typeof Pencil;
    run: () => void;
    danger?: boolean;
    disabled?: boolean;
  }

  const actions: ActionItem[] = [
    {
      label: "Editar",
      icon: Pencil,
      run: () => {
        onEdit({ mode: "edit", form });
      },
    },
    {
      label: "Subir",
      icon: ArrowUp,
      run: () => {
        void moveForm(form.id, -1);
      },
      disabled: isFirst || !form.enabled,
    },
    {
      label: "Bajar",
      icon: ArrowDown,
      run: () => {
        void moveForm(form.id, 1);
      },
      disabled: isLast || !form.enabled,
    },
    form.enabled
      ? {
          label: "Deshabilitar",
          icon: X,
          run: () => {
            void disableForm(form.id);
          },
        }
      : {
          label: "Habilitar",
          icon: RotateCcw,
          run: () => {
            void enableForm(form.id);
          },
        },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      run: () => {
        void softDeleteForm(form.id);
      },
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 flex min-w-40 flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
              action.danger === true
                ? "text-rose-300 hover:bg-rose-500/10"
                : "text-zinc-200 hover:bg-zinc-800"
            } disabled:pointer-events-none disabled:opacity-40`}
            disabled={action.disabled === true}
            onClick={() => {
              onClose();
              action.run();
            }}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function FormList() {
  const activeSectionId = useSectionStore((store) => store.activeSectionId);
  const activeSection = useSectionStore((store) =>
    store.sections.find(
      (candidate) => candidate.enabled && candidate.id === store.activeSectionId,
    ),
  );
  const forms = useSectionStore((store) => store.forms);
  const trashedForms = useSectionStore((store) => store.trashedForms);
  const loadingForms = useSectionStore((store) => store.loadingForms);
  const error = useSectionStore((store) => store.error);
  const activeFormId = useSectionStore((store) => store.activeFormId);
  const selectForm = useSectionStore((store) => store.selectForm);
  const restoreForm = useSectionStore((store) => store.restoreForm);
  const hardDeleteForm = useSectionStore((store) => store.hardDeleteForm);
  const openBuilder = useSectionStore((store) => store.openBuilder);

  const [modal, setModal] = useState<ModalState>(null);
  const [menuFormId, setMenuFormId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  function handleSelectForm(formId: string): void {
    selectForm(formId);
  }

  if (activeSectionId === null || activeSection === undefined) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <FolderOpen className="h-10 w-10 text-zinc-700" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-300">Sin sección activa</h2>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
            Selecciona una sección de la barra lateral para ver sus formularios y
            registros.
          </p>
        </div>
      </section>
    );
  }

  const enabledForms = forms.filter((form) => form.enabled);
  const disabledForms = forms.filter((form) => !form.enabled);
  const menuForm =
    menuFormId !== null
      ? [...forms].find((form) => form.id === menuFormId)
      : undefined;

  return (
    <section className="flex min-h-0 flex-col gap-2 border-b border-zinc-800 pb-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="truncate text-sm font-semibold text-zinc-200">
          Formularios ·{" "}
          <span className="font-normal text-zinc-400">{activeSection.name}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Papelera de formularios"
            title="Papelera"
            className={`rounded-md p-1.5 transition-colors ${
              showTrash
                ? "bg-amber-500/15 text-amber-300"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
            onClick={() => {
              setShowTrash((previous) => !previous);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Nuevo formulario"
            title="Nuevo formulario"
            className="rounded-md bg-teal-600 p-1.5 text-white transition-colors hover:bg-teal-500"
            onClick={() => {
              setModal({ mode: "create" });
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error !== null ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      {loadingForms && forms.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">Cargando formularios…</p>
      ) : showTrash ? (
        trashedForms.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-500">
            La papelera de formularios está vacía.
          </p>
        ) : (
          <ul className="space-y-1">
            {trashedForms.map((form) => (
              <li
                key={form.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 opacity-75"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-400 line-through">
                  {form.name}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-teal-400 hover:text-teal-300"
                  onClick={() => {
                    void restoreForm(form.id);
                  }}
                >
                  <RotateCcw className="mr-1 inline h-3 w-3" />
                  Restaurar
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-rose-500/40 px-2 py-1 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/10"
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Eliminar el formulario «${form.name}» definitivamente? Esta acción no se puede deshacer.`,
                      )
                    ) {
                      void hardDeleteForm(form.id);
                    }
                  }}
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )
      ) : enabledForms.length === 0 && disabledForms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-700 py-6 text-center">
          <LayoutList className="h-6 w-6 text-zinc-600" />
          <p className="max-w-xs text-xs leading-relaxed text-zinc-500">
            Esta sección no tiene formularios todavía. Crea uno para empezar a guardar
            registros.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-500"
            onClick={() => {
              setModal({ mode: "create" });
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Crear formulario
          </button>
        </div>
      ) : (
        <ul className="space-y-1">
          {[...enabledForms, ...disabledForms].map((form) => {
            const active = activeFormId === form.id;
            return (
              <li key={form.id} className={`relative ${form.enabled ? "" : "opacity-50"}`}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                    active
                      ? "border-teal-500/50 bg-teal-500/10"
                      : "border-transparent hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                  onClick={() => {
                    handleSelectForm(form.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectForm(form.id);
                    }
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {form.name}
                    </span>
                    {form.description !== null ? (
                      <span className="block truncate text-[11px] text-zinc-500">
                        {form.description}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    aria-label={`Constructor de ${form.name}`}
                    title="Diseñar campos"
                    className="shrink-0 rounded-md p-1 text-zinc-500 opacity-0 transition-all hover:bg-zinc-700 hover:text-teal-300 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectForm(form.id);
                      openBuilder();
                    }}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Menú de ${form.name}`}
                    className={`shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 ${
                      active
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuFormId(menuFormId === form.id ? null : form.id);
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
                {menuFormId === form.id && menuForm !== undefined ? (
                  <FormRowMenu
                    form={menuForm}
                    onClose={() => {
                      setMenuFormId(null);
                    }}
                    onEdit={setModal}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {modal !== null ? (
        <FormFormModal
          state={modal}
          sectionId={activeSectionId}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}
    </section>
  );
}

export type { ModalState as FormModalState };
