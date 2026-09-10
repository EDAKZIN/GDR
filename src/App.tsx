import { useEffect } from "react";
import { I18nProvider } from "./i18n";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { GlobalSearch } from "./ui/search/GlobalSearch";
import { MenuSidebar } from "./ui/menu/MenuSidebar";
import { ToastHost } from "./ui/menu/toast";
import { FormWorkspaceScreen } from "./ui/screens/FormWorkspaceScreen";
import { SectionFormsScreen } from "./ui/screens/SectionFormsScreen";
import { SectionsScreen } from "./ui/screens/SectionsScreen";
import { useRecordStore, useSectionStore, useUiStore } from "./stores";
import { ZOOM_STEP, getZoom, setZoom } from "./uiScale";

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

/** Atajo global Ctrl+F para abrir el buscador. */
function useSearchShortcut(onOpen: () => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
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

/** Atajos globales Ctrl+- / Ctrl++ para el zoom de interfaz (pasos de 10). */
function useZoomShortcut(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }
      if (event.key === "-" || event.key === "_" || event.key === "Subtract") {
        event.preventDefault();
        setZoom(getZoom() - ZOOM_STEP);
      } else if (
        event.key === "+" ||
        event.key === "=" ||
        event.key === "Add"
      ) {
        event.preventDefault();
        setZoom(getZoom() + ZOOM_STEP);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
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
  useZoomShortcut();
  useSearchShortcut(() => {
    setSearchOpen(true);
  });

  return (
    <ErrorBoundary>
      <I18nProvider>
        {/* Altura compensada por zoom: 100vh dentro de <html> con zoom se escala y deja franja sin pintar. */}
        <div className="flex h-[calc(100dvh/var(--gdr-zoom,1))] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
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

          <ToastHost />
        </div>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
