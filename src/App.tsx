import { useEffect, useState } from "react";
import { MousePointerClick, Search } from "lucide-react";
import { FormBuilder } from "./ui/forms/FormBuilder";
import { FormList } from "./ui/forms/FormList";
import { GlobalSearch } from "./ui/search/GlobalSearch";
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

/** Atajo global Ctrl+K para abrir el buscador. */
function useSearchShortcut(onOpen: () => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpen]);
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
  const [searchOpen, setSearchOpen] = useState(false);
  useFormSync();
  useSearchShortcut(() => {
    setSearchOpen(true);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <SectionSidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setSearchOpen(true);
            }}
            className="flex w-full max-w-sm items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-teal-400 hover:text-zinc-300"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Buscar en todo…</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
              Ctrl K
            </kbd>
          </button>
        </div>
        <FormList />
        <div className="flex min-h-0 flex-1 flex-col">
          {activeFormId !== null ? <RecordList /> : <RecordsPlaceholder withForm={false} />}
        </div>
      </main>

      <aside className="flex min-h-0 w-[26rem] shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/60 p-4">
        <DetailColumn />
      </aside>

      {searchOpen ? (
        <GlobalSearch
          onClose={() => {
            setSearchOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
