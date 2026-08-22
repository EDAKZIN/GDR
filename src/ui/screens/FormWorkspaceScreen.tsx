import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileStack,
  LayoutTemplate,
  Pencil,
  RotateCcw,
  Rows3,
  Trash2,
  X,
} from "lucide-react";
import type { Form } from "../../core/forms";
import { useRecordStore, useSectionStore } from "../../stores";
import { useBreadcrumb, useUiStore } from "../../stores/useUiStore";
import { ConfirmModal } from "../components/ConfirmModal";
import { FormModal } from "./FormModal";
import { RecordModal } from "../workspace/RecordModal";
import { RecordsTab } from "../workspace/RecordsTab";
import { TemplateTab } from "../workspace/TemplateTab";

type TabKey = "records" | "template";

type ConfirmState =
  | { kind: "deleteForm" }
  | { kind: "hardDeleteForm" }
  | null;

const tabButtonClass = (active: boolean): string =>
  `inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-sky-400 text-sky-300"
      : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
  }`;

/**
 * Pantalla FORMULARIO: workspace a pantalla completa con dos pestañas.
 * - Registros (por defecto): lista con búsqueda, y creación/edición en modal.
 * - Plantilla: constructor de campos del formulario.
 */
export function FormWorkspaceScreen() {
  const activeSectionId = useSectionStore((store) => store.activeSectionId);
  const activeFormId = useSectionStore((store) => store.activeFormId);
  const forms = useSectionStore((store) => store.forms);
  const trashedForms = useSectionStore((store) => store.trashedForms);
  const loadingForms = useSectionStore((store) => store.loadingForms);
  const enableForm = useSectionStore((store) => store.enableForm);
  const disableForm = useSectionStore((store) => store.disableForm);
  const softDeleteForm = useSectionStore((store) => store.softDeleteForm);
  const restoreForm = useSectionStore((store) => store.restoreForm);
  const hardDeleteForm = useSectionStore((store) => store.hardDeleteForm);

  const navigate = useUiStore((store) => store.navigate);
  const goBack = useUiStore((store) => store.goBack);
  const breadcrumb = useBreadcrumb();

  const [tab, setTab] = useState<TabKey>("records");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const form: Form | undefined =
    forms.find((candidate) => candidate.id === activeFormId) ??
    trashedForms.find((candidate) => candidate.id === activeFormId);

  // Sección eliminada o inexistente: volver al inicio.
  useEffect(() => {
    if (activeSectionId === null) {
      navigate("home");
    }
  }, [activeSectionId, navigate]);

  // Formulario borrado/inexistente (id nulo o id sin recurso cargado): volver a la sección.
  useEffect(() => {
    if (!loadingForms && (activeFormId === null || form === undefined)) {
      goBack();
    }
  }, [loadingForms, activeFormId, form, goBack]);

  if (activeSectionId === null || activeFormId === null || form === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Cargando formulario…</p>
      </div>
    );
  }

  const deletedForm = form.deletedAt !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex w-full flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        {/* Header: volver, icono, nombre/descripción editables y acciones */}
        <header className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={goBack}
            title="Volver a la sección"
            aria-label="Volver"
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
            <FileStack className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <nav
              aria-label="Migas de pan"
              className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-zinc-500"
            >
              {breadcrumb.map((item, index) => (
                <span
                  key={`${item.label}:${String(index)}`}
                  className="flex items-center gap-1.5"
                >
                  {index > 0 ? (
                    <span aria-hidden className="text-zinc-700">
                      /
                    </span>
                  ) : null}
                  {item.onClick !== undefined ? (
                    <button
                      type="button"
                      className="truncate rounded px-0.5 transition-colors hover:text-sky-300"
                      onClick={item.onClick}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="truncate text-zinc-300">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>

            <h1 className="truncate text-xl font-bold tracking-tight text-zinc-50">
              {form.name}
              {!form.enabled && !deletedForm ? (
                <span className="ml-2 inline-block translate-y-[-2px] rounded-full bg-zinc-800 px-2 py-0.5 align-middle text-[10px] font-medium normal-case text-zinc-500">
                  Deshabilitado
                </span>
              ) : null}
            </h1>
            {form.description !== null ? (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                {form.description}
              </p>
            ) : null}
          </div>

          {!deletedForm ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(true);
                }}
                title="Editar nombre y descripción"
                aria-label="Editar formulario"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editar info</span>
              </button>
              {form.enabled ? (
                <button
                  type="button"
                  onClick={() => {
                    void disableForm(form.id);
                  }}
                  title="Deshabilitar formulario"
                  aria-label="Deshabilitar formulario"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Deshabilitar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void enableForm(form.id);
                  }}
                  title="Habilitar formulario"
                  aria-label="Habilitar formulario"
                  className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-300 transition-colors hover:bg-sky-500/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Habilitar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setConfirm({ kind: "deleteForm" });
                }}
                title="Eliminar formulario"
                aria-label="Eliminar formulario"
                className="rounded-md border border-rose-500/40 bg-transparent p-2 text-rose-300 transition-colors hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </header>

        {/* Aviso de formulario eliminado: restaurar o borrar definitivo */}
        {deletedForm ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-rose-500/40 bg-rose-500/5 px-4 py-3">
            <p className="text-xs text-zinc-400">
              Este formulario está eliminado. Restáuralo para seguir usándolo o
              bórralo definitivamente.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/40 px-2.5 py-1.5 text-xs text-sky-300 transition-colors hover:bg-sky-500/10"
                onClick={() => {
                  void restoreForm(form.id);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 px-2.5 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
                onClick={() => {
                  setConfirm({ kind: "hardDeleteForm" });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Borrar definitivo
              </button>
            </div>
          </div>
        ) : null}

        {/* Pestañas internas */}
        <nav
          aria-label="Pestañas del formulario"
          className="flex shrink-0 items-center gap-1 border-b border-zinc-800"
        >
          <button
            type="button"
            className={tabButtonClass(tab === "records")}
            onClick={() => {
              setTab("records");
            }}
          >
            <Rows3 className="h-4 w-4" />
            Registros
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "template")}
            onClick={() => {
              setTab("template");
            }}
          >
            <LayoutTemplate className="h-4 w-4" />
            Plantilla
          </button>
        </nav>

        {tab === "records" ? (
          <RecordsTab
            onGoToTemplate={() => {
              setTab("template");
            }}
          />
        ) : (
          <TemplateTab
            key={`${form.id}:template`}
            formId={form.id}
            onChanged={() => {
              void useRecordStore.getState().reloadFields();
            }}
          />
        )}
      </div>

      {editModalOpen ? (
        <FormModal
          mode={{ kind: "edit", form }}
          onClose={() => {
            setEditModalOpen(false);
          }}
        />
      ) : null}

      {confirm?.kind === "deleteForm" ? (
        <ConfirmModal
          title="Eliminar formulario"
          message={`El formulario «${form.name}» pasará a la papelera de la sección junto con sus campos y registros.`}
          confirmLabel="Eliminar"
          onConfirm={() => softDeleteForm(form.id)}
          onClose={() => {
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm?.kind === "hardDeleteForm" ? (
        <ConfirmModal
          title="Borrar formulario definitivamente"
          message={`Se eliminarán «${form.name}» y todos sus registros para siempre. Esta acción no se puede deshacer.`}
          confirmLabel="Borrar definitivo"
          onConfirm={() => hardDeleteForm(form.id)}
          onClose={() => {
            setConfirm(null);
          }}
        />
      ) : null}

      {/* Modal de detalle / creación / edición de registro (según store). */}
      <RecordModal />
    </div>
  );
}
