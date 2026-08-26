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
import { useT } from "../../i18n";
import { useSectionStore } from "../../stores";
import { useUiStore } from "../../stores/useUiStore";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { FloatingMenu, type FloatingMenuAnchor } from "../components/FloatingMenu";
import { IconRenderer } from "../components/IconRenderer";
import { btnDangerGhost } from "../components/uiStyles";
import { openSection } from "../navigation/openSection";
import { FlatSectionScreen } from "./FlatSectionScreen";
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
  anchor,
  form,
  isFirst,
  isLast,
  onEdit,
  onClose,
}: {
  anchor: FloatingMenuAnchor;
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
  const { t } = useT();

  const actions: MenuAction[] = [
    {
      label: t("comun.editar"),
      icon: Pencil,
      run: () => {
        onEdit(form);
      },
    },
    {
      label: t("comun.subir"),
      icon: ArrowUp,
      run: () => {
        void moveForm(form.id, -1);
      },
      disabled: isFirst || !form.enabled,
    },
    {
      label: t("comun.bajar"),
      icon: ArrowDown,
      run: () => {
        void moveForm(form.id, 1);
      },
      disabled: isLast || !form.enabled,
    },
    form.enabled
      ? {
          label: t("comun.deshabilitar"),
          icon: X,
          run: () => {
            void disableForm(form.id);
          },
        }
      : {
          label: t("comun.habilitar"),
          icon: RotateCcw,
          run: () => {
            void enableForm(form.id);
          },
        },
    {
      label: t("comun.eliminar"),
      icon: Trash2,
      danger: true,
      run: () => {
        void softDeleteForm(form.id);
      },
    },
  ];

  return (
    <FloatingMenu anchor={anchor} widthClass="w-40" onClose={onClose}>
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
    </FloatingMenu>
  );
}

function FormCard({
  form,
  isFirst,
  isLast,
  onEdit,
  onOpenMenu,
  menuAnchor,
}: {
  form: Form;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (form: Form) => void;
  onOpenMenu: (anchor: FloatingMenuAnchor | null) => void;
  menuAnchor: FloatingMenuAnchor | null;
}) {
  const navigate = useUiStore((store) => store.navigate);
  const { t } = useT();

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
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-500/15 text-sky-300">
          {form.icon !== null ? (
            <IconRenderer icon={form.icon} className="h-5 w-5" />
          ) : (
            <FileStack className="h-5 w-5" />
          )}
        </span>
        <button
          type="button"
          aria-label={t("comun.menuDe", { n: form.name })}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
          onClick={(event) => {
            event.stopPropagation();
            // Capturar el rect ANTES de usarlo: React pone currentTarget en
            // null al salir del handler.
            const rect = event.currentTarget.getBoundingClientRect();
            onOpenMenu(menuAnchor !== null ? null : rect);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100">{form.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-zinc-500">
          {form.description ?? t("comun.sinDescripcion")}
        </p>
      </div>

      {!form.enabled ? (
        <footer>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500">
            {t("formularios.deshabilitado")}
          </span>
        </footer>
      ) : null}

      {menuAnchor !== null ? (
        <FormCardMenu
          anchor={menuAnchor}
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

/**
 * Panel de sección JERÁRQUICA: tarjetas de formularios con papelera y modales.
 * Las secciones planas (allowChildren=false) delegan en FlatSectionScreen,
 * que muestra la lista de registros como un único nivel de navegación.
 */
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
  const { t } = useT();

  const [menuAnchor, setMenuAnchor] = useState<FloatingMenuAnchor | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>(null);
  const [sectionModal, setSectionModal] = useState<SectionModalState>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmHardDeleteForm, setConfirmHardDeleteForm] =
    useState<Form | null>(null);

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

  // Esc cierra el menú contextual o la papelera: los modales gestionan su
  // propio Esc (y no se desmontan durante un guardado en curso).
  useEffect(() => {
    if (menuAnchor === null && !showTrash) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuAnchor(null);
        setShowTrash(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuAnchor, showTrash]);

  if (activeSectionId === null || activeSection === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">{t("secciones.cargandoSeccion")}</p>
      </div>
    );
  }

  // Sección plana: vista unificada de registros en un solo nivel.
  if (!activeSection.allowChildren) {
    return <FlatSectionScreen />;
  }

  const enabledForms = forms.filter((form) => form.enabled);
  const disabledForms = forms.filter((form) => !form.enabled);
  const orderedCards = [...enabledForms, ...disabledForms];

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
            title={t("formularios.volverSeccionesTitle")}
            aria-label={t("comun.volver")}
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
            <>
              <button
                type="button"
                onClick={() => {
                  setShowTrash((previous) => !previous);
                  setMenuAnchor(null);
                }}
                  title={t("formularios.papeleraTitle")}
                  aria-label={t("formularios.papeleraTitle")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    showTrash
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-zinc-100"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("papelera.boton")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSectionModal({ kind: "edit", section: activeSection });
                  }}
                  title={t("secciones.editar")}
                  aria-label={t("secciones.editar")}
                  className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("secciones.editar")}</span>
                </button>
            </>
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
              {t("secciones.subseccionesTitulo", { n: childSections.length })}
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
                    openSection(child.id);
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
                        ? t("secciones.contadorUno")
                        : t("secciones.contadorVarios", { n: formCounts[child.id] ?? 0 })}
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
              {t("formularios.papeleraLista")}
            </h2>
            {trashedForms.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                {t("formularios.papeleraVacia")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trashedForms.map((form) => (
                  <li
                    key={form.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 opacity-80"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500">
                      {form.icon !== null ? (
                        <IconRenderer icon={form.icon} className="h-4 w-4 shrink-0 text-zinc-500" />
                      ) : (
                        <FileStack className="h-4 w-4 shrink-0 text-zinc-500" />
                      )}
                    </span>
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
                      {t("comun.restaurar")}
                    </button>
                    <button
                      type="button"
                      className={`shrink-0 px-2 py-1 text-[11px] ${btnDangerGhost}`}
                      onClick={() => {
                        setConfirmHardDeleteForm(form);
                      }}
                    >
                      {t("comun.borrar")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : loadingForms && orderedCards.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            {t("formularios.cargando")}
          </p>
        ) : orderedCards.length === 0 ? (
          /* Estado vacío inicial */
          <EmptyState
            icon={LayoutList}
            title={t("formularios.seccionSinFormularios")}
            description={t("formularios.seccionSinFormulariosDesc")}
            actionLabel={t("formularios.creaPrimero")}
            onAction={openCreate}
          />
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
                menuAnchor={menuAnchor}
                onOpenMenu={(anchor) => {
                  setMenuAnchor(anchor);
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
              <span className="text-sm font-semibold">{t("formularios.nuevo")}</span>
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
      {confirmHardDeleteForm !== null ? (
        <ConfirmModal
          title={t("formularios.borrarDefTitulo")}
          message={t("formularios.borrarDefMensaje", { n: confirmHardDeleteForm.name })}
          confirmLabel={t("comun.borrarDefinitivo")}
          onConfirm={() => hardDeleteForm(confirmHardDeleteForm.id)}
          onClose={() => {
            setConfirmHardDeleteForm(null);
          }}
        />
      ) : null}
    </div>
  );
}
