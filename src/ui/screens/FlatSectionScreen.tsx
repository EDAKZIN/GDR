import { useEffect, useState } from "react";
import { ArrowLeft, LayoutTemplate, Pencil, Rows3 } from "lucide-react";
import type { Form } from "../../core/forms";
import { useT } from "../../i18n";
import { useRecordStore, useSectionStore } from "../../stores";
import { useUiStore } from "../../stores/useUiStore";
import { EmptyState } from "../components/EmptyState";
import { IconRenderer } from "../components/IconRenderer";
import { RecordModal } from "../workspace/RecordModal";
import { RecordsTable } from "../workspace/RecordsTable";
import { TemplateTab } from "../workspace/TemplateTab";
import { SectionModal } from "./SectionModal";

type ScreenView = "records" | "template";

const viewButtonClass = (active: boolean): string =>
  `inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
    active
      ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-zinc-100"
  }`;

/**
 * Pantalla UNIFICADA de sección plana (allowChildren=false): la sección es UN
 * solo nivel de navegación. El formulario homónimo es invisible: el header
 * muestra la SECCIÓN y debajo la tabla de registros directamente. Caso legacy
 * de >1 formulario vivo → pestañas por formulario.
 */
export function FlatSectionScreen() {
  const activeSectionId = useSectionStore((store) => store.activeSectionId);
  const sections = useSectionStore((store) => store.sections);
  const forms = useSectionStore((store) => store.forms);
  const loadingForms = useSectionStore((store) => store.loadingForms);
  const loadingSections = useSectionStore((store) => store.loadingSections);

  const navigate = useUiStore((store) => store.navigate);
  const goBack = useUiStore((store) => store.goBack);
  const { t } = useT();

  const [view, setView] = useState<ScreenView>("records");
  const [editOpen, setEditOpen] = useState(false);

  const section = sections.find(
    (candidate) => candidate.id === activeSectionId && !candidate.deletedAt,
  );

  const enabledForms = forms.filter((form) => form.enabled);
  const singleForm = enabledForms.length === 1 ? enabledForms[0] : undefined;
  // El editor de plantilla integrado aplica al modelo normal (una sola lista).
  const canEditTemplate = singleForm !== undefined;

  // CRÍTICO: la tabla lee del store global de registros, sincronizado con
  // activeFormId. Sin esta selección, la tabla muestra los datos del
  // formulario anterior (o vacío) y los registros "desaparecen" de la UI.
  const activeFormId = useSectionStore((store) => store.activeFormId);
  const selectForm = useSectionStore((store) => store.selectForm);
  useEffect(() => {
    if (singleForm !== undefined && activeFormId !== singleForm.id) {
      selectForm(singleForm.id);
    }
  }, [singleForm, activeFormId, selectForm]);

  // Sección eliminada o inexistente: volver al inicio.
  useEffect(() => {
    if (!loadingSections && (activeSectionId === null || section === undefined)) {
      navigate("home");
    }
  }, [activeSectionId, section, loadingSections, navigate]);

  if (activeSectionId === null || section === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">{t("secciones.cargandoSeccion")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex w-full flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        {/* Header: volver, icono y nombre de la SECCIÓN + acciones */}
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            title={t("comun.volver")}
            aria-label={t("comun.volver")}
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-500/15 text-sky-300">
            <IconRenderer icon={section.icon} className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-zinc-50">
              {section.name}
            </h1>
            {section.description !== null ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {section.description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditOpen(true);
              }}
              title={t("secciones.editar")}
              aria-label={t("secciones.editar")}
              className={viewButtonClass(false)}
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">{t("secciones.editar")}</span>
            </button>
            {canEditTemplate ? (
              view === "records" ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("template");
                  }}
                  title={t("formularios.editarPlantillaTitle")}
                  className={viewButtonClass(false)}
                >
                  <LayoutTemplate className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("formularios.editarPlantilla")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setView("records");
                  }}
                  title={t("formularios.verRegistrosTitle")}
                  className={viewButtonClass(true)}
                >
                  <Rows3 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("formularios.verRegistros")}</span>
                </button>
              )
            ) : null}
          </div>
        </header>

        {loadingForms && enabledForms.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            {t("registros.cargando")}
          </p>
        ) : enabledForms.length === 0 ? (
          /* Caso raro: la lista automática fue deshabilitada o eliminada. */
          <EmptyState
            icon={LayoutTemplate}
            title={t("formularios.seccionPlanaSinLista")}
            description={t("formularios.seccionPlanaSinListaDesc")}
          />
        ) : view === "template" && singleForm !== undefined ? (
          /* Editor de campos integrado en la misma pantalla. */
          <TemplateTab
            key={`${singleForm.id}:template`}
            formId={singleForm.id}
            onChanged={() => {
              void useRecordStore.getState().reloadFields();
            }}
          />
        ) : singleForm !== undefined ? (
          /* Modelo normal: tabla de registros directa, sin nodo intermedio. */
          <>
            <RecordsTable
              key={singleForm.id}
              formName={singleForm.name}
              templateCtaLabel={t("plantilla.anadirCamposCta")}
              onGoToTemplate={() => {
                setView("template");
              }}
            />
            <RecordModal />
          </>
        ) : (
          /* Legacy: sección plana con varios formularios vivos → pestañas. */
          <LegacyFlatTabs formIds={enabledForms.map((form) => form.id)} />
        )}
      </div>

      {editOpen ? (
        <SectionModal
          mode={{ kind: "edit", section }}
          onClose={() => {
            setEditOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** Pestañas por formulario para el caso legacy de sección plana con varios. */
function LegacyFlatTabs({ formIds }: { formIds: readonly string[] }) {
  const forms = useSectionStore((store) => store.forms);
  const selectForm = useSectionStore((store) => store.selectForm);
  const navigate = useUiStore((store) => store.navigate);
  const { t } = useT();

  const liveForms = formIds
    .map((id) => forms.find((form) => form.id === id))
    .filter((form): form is Form => form !== undefined);

  const [tabId, setTabId] = useState(formIds[0] ?? "");
  const current = liveForms.find((form) => form.id === tabId);

  // Si la pestaña activa dejó de existir, cae a la primera disponible.
  // Ajuste de estado durante el render (patrón oficial de React), sin efectos.
  if (current === undefined && liveForms.length > 0) {
    setTabId(liveForms[0].id);
  }

  useEffect(() => {
    if (current !== undefined) {
      selectForm(current.id);
    }
  }, [current, selectForm]);

  if (current === undefined) {
    return null;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <nav
        aria-label={t("formularios.formulariosSeccionAria")}
        className="flex shrink-0 flex-wrap items-center gap-1 border-b border-zinc-800"
      >
        {liveForms.map((form) => (
          <button
            key={form.id}
            type="button"
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              form.id === current.id
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
            onClick={() => {
              setTabId(form.id);
            }}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
              {form.icon !== null ? (
                <IconRenderer
                  icon={form.icon}
                  className={`h-3.5 w-3.5 shrink-0 ${
                    form.id === current.id ? "text-sky-300" : "text-zinc-500"
                  }`}
                />
              ) : null}
            </span>
            {form.name}
          </button>
        ))}
      </nav>

      <RecordsTable
        key={current.id}
        formName={current.name}
        onGoToTemplate={() => {
          navigate("form", current.id);
        }}
      />

      <RecordModal />
    </section>
  );
}
