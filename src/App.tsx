import { useEffect } from "react";
import { MousePointerClick } from "lucide-react";
import { FormBuilder } from "./ui/forms/FormBuilder";
import { FormList } from "./ui/forms/FormList";
import { RecordDetail } from "./ui/records/RecordDetail";
import { RecordEditor } from "./ui/records/RecordEditor";
import { RecordList } from "./ui/records/RecordList";
import { SectionSidebar } from "./ui/sections/SectionSidebar";
import { useRecordStore, useSectionStore } from "./stores";

/**
 * Sincroniza el formulario activo entre useSectionStore y useRecordStore:
 * - Al seleccionar un formulario se cargan sus campos y registros.
 * - Al cerrar el constructor se recargan (pueden haber cambiado los campos).
 */
function useFormSync(): void {
  const activeFormId = useSectionStore((store) => store.activeFormId);
  const formBuilderOpen = useSectionStore((store) => store.formBuilderOpen);

  useEffect(() => {
    const records = useRecordStore.getState();
    if (activeFormId === null) {
      if (records.formId !== null) {
        records.closeForm();
      }
      return;
    }
    if (records.formId !== activeFormId || !formBuilderOpen) {
      void useRecordStore.getState().openForm(activeFormId);
    }
  }, [activeFormId, formBuilderOpen]);
}

function RecordsPlaceholder({ withForm }: { withForm: boolean }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <MousePointerClick className="h-10 w-10 text-zinc-700" />
      <div>
        <h2 className="text-lg font-semibold text-zinc-300">
          {withForm ? "Ningún registro abierto" : "Sin formulario activo"}
        </h2>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
          {withForm
            ? "Selecciona un registro de la lista para verlo aquí, o crea uno nuevo."
            : "Selecciona o crea un formulario en esta sección para gestionar sus registros."}
        </p>
      </div>
    </section>
  );
}

/** Columna derecha: constructor de formularios o detalle/edición del registro. */
function DetailColumn() {
  const activeFormId = useSectionStore((store) => store.activeFormId);
  const formBuilderOpen = useSectionStore((store) => store.formBuilderOpen);
  const activeMode = useRecordStore((store) => store.activeMode);

  if (activeFormId !== null && formBuilderOpen) {
    return <FormBuilder key={activeFormId} />;
  }
  if (activeMode === "edit" || activeMode === "create") {
    return <RecordEditor />;
  }
  if (activeMode === "view" && activeFormId !== null) {
    return <RecordDetail />;
  }
  return <RecordsPlaceholder withForm={activeFormId !== null} />;
}

function App() {
  const activeFormId = useSectionStore((store) => store.activeFormId);
  useFormSync();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <SectionSidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <FormList />
        <div className="flex min-h-0 flex-1 flex-col">
          {activeFormId !== null ? <RecordList /> : <RecordsPlaceholder withForm={false} />}
        </div>
      </main>

      <aside className="flex min-h-0 w-[26rem] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/60 p-4">
        <DetailColumn />
      </aside>
    </div>
  );
}

export default App;
