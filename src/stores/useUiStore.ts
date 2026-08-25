import { create } from "zustand";
import { translate } from "../i18n";
import { useSectionStore } from "./useSectionStore";

/** Niveles de navegación de la app: inicio, sección o formulario. */
export type UiView = "home" | "section" | "form";

export interface UiRoute {
  view: UiView;
  /** Id de la sección o del formulario según el nivel de la ruta. */
  id?: string;
}

interface UiState {
  /** Pila de rutas; la última es la pantalla visible. */
  routes: UiRoute[];
  view: UiView;
  searchOpen: boolean;

  navigate: (view: UiView, id?: string) => void;
  goBack: () => void;
  setSearchOpen: (open: boolean) => void;
}

/**
 * Navegación por pantallas enfocadas (home → sección → formulario).
 * Los ids activos viven en useSectionStore; este store solo gestiona la ruta
 * y sincroniza la selección al navegar.
 */
export const useUiStore = create<UiState>()((set, get) => ({
  routes: [{ view: "home" }],
  view: "home",
  searchOpen: false,

  navigate: (view, id) => {
    const sectionStore = useSectionStore.getState();
    if (view === "home") {
      set({ routes: [{ view: "home" }], view: "home" });
      return;
    }
    if (view === "section") {
      // Entrar a una sección siempre parte del nivel 2.
      set({ routes: [{ view: "home" }, { view: "section", id }], view: "section" });
      if (id !== undefined && sectionStore.activeSectionId !== id) {
        void sectionStore.selectSection(id);
      }
      return;
    }
    const withoutForms = get().routes.filter((route) => route.view !== "form");
    set({ routes: [...withoutForms, { view: "form", id }], view: "form" });
    if (id !== undefined && sectionStore.activeFormId !== id) {
      sectionStore.selectForm(id);
    }
  },

  goBack: () => {
    const routes = get().routes;
    if (routes.length <= 1) {
      return;
    }
    const remaining = routes.slice(0, -1);
    set({ routes: remaining, view: remaining[remaining.length - 1].view });
  },

  setSearchOpen: (open) => {
    set({ searchOpen: open });
  },
}));

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

/** Migas de pan derivadas de la pila de rutas y los stores de dominio. */
export function useBreadcrumb(): BreadcrumbItem[] {
  const route = useUiStore((state) => state.routes[state.routes.length - 1]);
  const sections = useSectionStore((state) => state.sections);
  const forms = useSectionStore((state) => state.forms);

  const items: BreadcrumbItem[] = [
    {
      label: translate("comun.inicio"),
      onClick: () => {
        useUiStore.getState().navigate("home");
      },
    },
  ];

  if (route.view === "home") {
    return items;
  }

  const activeSectionId =
    route.view === "section" ? route.id : useSectionStore.getState().activeSectionId;
  const activeFormId = route.view === "form" ? route.id : null;

  const section = sections.find((candidate) => candidate.id === activeSectionId);
  if (section !== undefined) {
    items.push({
      label: section.name,
      onClick:
        route.view === "form"
          ? () => {
              useUiStore.getState().navigate("section", section.id);
            }
          : undefined,
    });
  }

  if (activeFormId !== null) {
    const form = forms.find((candidate) => candidate.id === activeFormId);
    if (form !== undefined) {
      items.push({ label: form.name });
    }
  }

  return items;
}
