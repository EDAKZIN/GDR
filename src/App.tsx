import { useEffect } from "react";
import { GlobalSearch } from "./ui/search/GlobalSearch";
import { MenuSidebar } from "./ui/menu/MenuSidebar";
import { FormWorkspaceScreen } from "./ui/screens/FormWorkspaceScreen";
import { SectionFormsScreen } from "./ui/screens/SectionFormsScreen";
import { SectionsScreen } from "./ui/screens/SectionsScreen";
import { useRecordStore, useSectionStore, useUiStore } from "./stores";

/**
 * Sincroniza el formulario activo entre useSectionStore y useRecordStore:
 * al seleccionar un formulario se cargan sus campos y registros.
 */
function useFormSync(): void {
  const activeFormId = useSectionStore((store) => store.activeFormId);

  useEffect(() => {
    const records = useRecordStore.getState();
    if (activeFormId === null) {
      if (records.formId !== null) {
        records.closeForm();
      }
      return;
    }
    if (records.formId !== activeFormId) {
      void useRecordStore.getState().openForm(activeFormId);
    }
  }, [activeFormId]);
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

/** Router mínimo: una pantalla enfocada a la vez según useUiStore. */
function CurrentScreen() {
  const view = useUiStore((store) => store.view);

  if (view === "section") {
    return <SectionFormsScreen />;
  }
  if (view === "form") {
    return <FormWorkspaceScreen />;
  }
  return <SectionsScreen />;
}

function App() {
  const searchOpen = useUiStore((store) => store.searchOpen);
  const setSearchOpen = useUiStore((store) => store.setSearchOpen);
  useFormSync();
  useSearchShortcut(() => {
    setSearchOpen(true);
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <MenuSidebar>
        <CurrentScreen />
      </MenuSidebar>

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
