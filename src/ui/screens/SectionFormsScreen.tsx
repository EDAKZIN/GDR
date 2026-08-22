import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileStack,
  FolderOpen,
  LayoutList,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Form } from "../../core/forms";
import type { Section } from "../../core/sections";
import { useSectionStore } from "../../stores";
import { useUiStore } from "../../stores/useUiStore";
import { IconRenderer } from "../components/IconRenderer";
import { FormModal } from "./FormModal";
import { SectionModal } from "./SectionModal";

type FormModalState =
  | { kind: "create"; sectionId: string }
  | { kind: "edit"; form: Form }
  | null;

type SectionModalState = { kind: "edit"; section: Section } | null;

interface MenuAction {
  label: string;
  icon: typeof Pencil;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function FormCardMenu({
  form,
  isFirst,
  isLast,
  onEdit,
  onClose,
}: {
  form: Form;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (form: Form) => void;
  onClose: () => void;
}) {
  const enableForm = useSectionStore((store) => store.enableForm);
  const disableForm = useSectionStore((store) => store.disableForm);
  const softDeleteForm = useSectionStore((store) => store.softDeleteForm);
  const moveForm = useSectionStore((store) => store.moveForm);

  const actions: MenuAction[] = [
    {
      label: "Editar",
      icon: Pencil,
      run: () => {
        onEdit(form);
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
      <div className="absolute right-3 top-12 z-50 flex min-w-40 flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
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

function FormCard({
  form,
  isFirst,
  isLast,
  onEdit,
  onOpenMenu,
  menuOpen,
}: {
  form: Form;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (form: Form) => void;
  onOpenMenu: (formId: string | null) => void;
  menuOpen: boolean;
}) {
  const navigate = useUiStore((store) => store.navigate);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition-colors hover:border-sky-500/50 hover:bg-zinc-900 ${
        form.enabled ? "" : "opacity-50"
      }`}
      onClick={() => {
        navigate("form", form.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate("form", form.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
          <FileStack className="h-5 w-5" />
        </span>
        <button
          type="button"
          aria-label={`Menú de ${form.name}`}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMenu(menuOpen ? null : form.id);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100">{form.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-zinc-500">
          {form.description ?? "Sin descripción."}
        </p>
      </div>

      {!form.enabled ? (
        <footer>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
            Deshabilitado
          </span>
        </footer>
      ) : null}

      {menuOpen ? (
        <FormCardMenu
          form={form}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={onEdit}
          onClose={() => {
            onOpenMenu(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Pantalla SECCIÓN: tarjetas de formularios con papelera y modales. */
export function SectionFormsScreen() {
  const activeSectionId = useSectionStore((store) => store.activeSectionId);
  const sections = useSectionStore((store) => store.sections);
  const formCounts = useSectionStore((store) => store.formCounts);
  const loadingSections = useSectionStore((store) => store.loadingSections);
  const forms = useSectionStore((store) => store.forms);
  const trashedForms = useSectionStore((store) => store.trashedForms);
  const loadingForms = useSectionStore((store) => store.loadingForms);
  const error = useSectionStore((store) => store.error);
  const restoreForm = useSectionStore((store) => store.restoreForm);
  const hardDeleteForm = useSectionStore((store) => store.hardDeleteForm);

  const navigate = useUiStore((store) => store.navigate);
  const goBack = useUiStore((store) => store.goBack);

  const [menuFormId, setMenuFormId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>(null);
  const [sectionModal, setSectionModal] = useState<SectionModalState>(null);
  const [showTrash, setShowTrash] = useState(false);

  const activeSection = sections.find(
    (section) => section.id === activeSectionId && !section.deletedAt,
  );

  // Sub-secciones hijas directas de la sección activa.
  const childSections = sections.filter(
    (section) => section.parentId === activeSectionId,
  );

  useEffect(() => {
    if (activeSectionId === null) {
      // Sección eliminada o inexistente: volver al inicio.
      navigate("home");
      return;
    }
    // Sección activa apuntando a un id inexistente/eliminado: nunca quedarse cargando.
    if (!loadingSections && activeSection === undefined) {
      navigate("home");
    }
  }, [activeSectionId, activeSection, loadingSections, navigate]);

  // Esc cierra el menú contextual, los modales o la papelera.
  useEffect(() => {
    if (menuFormId === null && formModal === null && sectionModal === null && !showTrash) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuFormId(null);
        setFormModal(null);
        setSectionModal(null);
        setShowTrash(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuFormId, formModal, sectionModal, showTrash]);

  if (activeSectionId === null || activeSection === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Cargando sección…</p>
      </div>
    );
  }

  const enabledForms = forms.filter((form) => form.enabled);
  const disabledForms = forms.filter((form) => !form.enabled);
  const orderedCards = [...enabledForms, ...disabledForms];
  const isEmpty = orderedCards.length === 0;

  function openCreate(): void {
    setFormModal({ kind: "create", sectionId: activeSection?.id ?? "" });
  }

  function openEditForm(form: Form): void {
    setFormModal({ kind: "edit", form });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {/* Header con navegación de vuelta */}
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              goBack();
            }}
            title="Volver a las secciones"
            aria-label="Volver"
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
            <IconRenderer icon={activeSection.icon} className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-zinc-50">
              {activeSection.name}
            </h1>
            {activeSection.description !== null ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {activeSection.description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTrash((previous) => !previous);
                setMenuFormId(null);
              }}
              title="Papelera de formularios"
              aria-label="Papelera de formularios"
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                showTrash
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-zinc-100"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Papelera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSectionModal({ kind: "edit", section: activeSection });
              }}
              title="Editar sección"
              aria-label="Editar sección"
              className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar sección</span>
            </button>
          </div>
        </header>

        {error !== null ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}

        {/* Sub-secciones hijas */}
        {!showTrash && childSections.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Subsecciones ({String(childSections.length)})
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {childSections.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className={`group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition-colors duration-150 hover:border-sky-500/50 hover:bg-zinc-900 ${
                    child.enabled ? "" : "opacity-50"
                  }`}
                  onClick={() => {
                    navigate("section", child.id);
                  }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-sky-500/10 text-sky-300">
                    <IconRenderer icon={child.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {child.name}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500">
                      {(formCounts[child.id] ?? 0) === 1
                        ? "1 formulario"
                        : `${String(formCounts[child.id] ?? 0)} formularios`}
                    </span>
                  </span>
                  <FolderOpen className="h-4 w-4 shrink-0 text-zinc-700 transition-colors duration-150 group-hover:text-sky-400" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Papelera */}
        {showTrash ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Papelera · formularios eliminados
            </h2>
            {trashedForms.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                La papelera de formularios está vacía.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trashedForms.map((form) => (
                  <li
                    key={form.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 opacity-80"
                  >
                    <FileStack className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-400 line-through">
                      {form.name}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-sky-400 hover:text-sky-300"
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
            )}
          </section>
        ) : loadingForms && isEmpty ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Cargando formularios…
          </p>
        ) : isEmpty ? (
          /* Estado vacío inicial */
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <LayoutList className="h-10 w-10 text-zinc-700" />
            <div>
              <h2 className="text-base font-semibold text-zinc-200">
                Esta sección no tiene formularios
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
                Los formularios definen los campos con los que guardarás registros.
              </p>
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Crea tu primer formulario
            </button>
          </div>
        ) : (
          /* Grid fluido de tarjetas + botón destacado */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {orderedCards.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                isFirst={enabledForms[0]?.id === form.id}
                isLast={
                  form.enabled
                    ? enabledForms[enabledForms.length - 1]?.id === form.id
                    : disabledForms[disabledForms.length - 1]?.id === form.id
                }
                menuOpen={menuFormId === form.id}
                onOpenMenu={(formId) => {
                  setMenuFormId(formId);
                }}
                onEdit={openEditForm}
              />
            ))}

            <button
              type="button"
              className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sky-500/40 bg-sky-500/5 p-4 text-sky-300 transition-colors hover:border-sky-400 hover:bg-sky-500/10"
              onClick={openCreate}
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm font-semibold">Nuevo formulario</span>
            </button>
          </div>
        )}
      </div>

      {formModal !== null ? (
        <FormModal
          mode={formModal}
          onClose={() => {
            setFormModal(null);
          }}
        />
      ) : null}
      {sectionModal !== null ? (
        <SectionModal
          mode={sectionModal}
          onClose={() => {
            setSectionModal(null);
          }}
        />
      ) : null}
    </div>
  );
}
