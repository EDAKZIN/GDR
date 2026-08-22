import { create } from "zustand";
import type {
  CreateFormInput,
  Form,
  UpdateFormInput,
} from "../core/forms";
import type {
  CreateSectionInput,
  Section,
  UpdateSectionInput,
} from "../core/sections";
import { getDb } from "../database/client";
import {
  createFormsRepository,
  createSectionsRepository,
} from "../database/repositories";

const sectionsRepository = createSectionsRepository(getDb);
const formsRepository = createFormsRepository(getDb);

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Mueve un id una posición dentro de la lista ordenada y devuelve los ids
 * resultantes (para pasarlos a repository.reorder). Devuelve null si el
 * movimiento no es posible (primero/último o id ausente).
 */
export function moveIdInList(list: readonly string[], id: string, delta: -1 | 1): string[] | null {
  const index = list.indexOf(id);
  if (index === -1) {
    return null;
  }
  const target = index + delta;
  if (target < 0 || target >= list.length) {
    return null;
  }
  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export interface SectionState {
  /** Secciones NO eliminadas (habilitadas y deshabilitadas). */
  sections: Section[];
  /** Secciones eliminadas (papelera). */
  trashedSections: Section[];
  activeSectionId: string | null;

  /** Formularios de la sección activa NO eliminados. */
  forms: Form[];
  /** Formularios eliminados de la sección activa. */
  trashedForms: Form[];
  activeFormId: string | null;
  formBuilderOpen: boolean;

  loadingSections: boolean;
  loadingForms: boolean;
  error: string | null;

  loadSections: () => Promise<void>;
  selectSection: (sectionId: string) => Promise<void>;

  createSection: (input: CreateSectionInput) => Promise<Section>;
  updateSection: (id: string, input: UpdateSectionInput) => Promise<void>;
  enableSection: (id: string) => Promise<void>;
  disableSection: (id: string) => Promise<void>;
  softDeleteSection: (id: string) => Promise<void>;
  restoreSection: (id: string) => Promise<void>;
  hardDeleteSection: (id: string) => Promise<void>;
  moveSection: (id: string, delta: -1 | 1) => Promise<void>;

  loadForms: (sectionId: string) => Promise<void>;
  selectForm: (formId: string) => void;

  createForm: (input: Omit<CreateFormInput, "sectionId"> & { sectionId: string }) => Promise<Form>;
  updateForm: (id: string, input: UpdateFormInput) => Promise<void>;
  enableForm: (id: string) => Promise<void>;
  disableForm: (id: string) => Promise<void>;
  softDeleteForm: (id: string) => Promise<void>;
  restoreForm: (id: string) => Promise<void>;
  hardDeleteForm: (id: string) => Promise<void>;
  moveForm: (id: string, delta: -1 | 1) => Promise<void>;

  openBuilder: () => void;
  closeBuilder: () => void;
}

async function loadAllSections(): Promise<{
  sections: Section[];
  trashedSections: Section[];
}> {
  const [all, deleted] = await Promise.all([
    sectionsRepository.list({ includeDisabled: true }),
    sectionsRepository.list({ includeDisabled: true, includeDeleted: true }),
  ]);
  return {
    sections: all,
    trashedSections: deleted.filter((section) => section.deletedAt !== null),
  };
}

async function loadSectionForms(sectionId: string): Promise<{
  forms: Form[];
  trashedForms: Form[];
}> {
  const [all, deleted] = await Promise.all([
    formsRepository.listBySection(sectionId, { includeDisabled: true }),
    formsRepository.listBySection(sectionId, {
      includeDisabled: true,
      includeDeleted: true,
    }),
  ]);
  return {
    forms: all,
    trashedForms: deleted.filter((form) => form.deletedAt !== null),
  };
}

export const useSectionStore = create<SectionState>()((set, get) => ({
  sections: [],
  trashedSections: [],
  activeSectionId: null,

  forms: [],
  trashedForms: [],
  activeFormId: null,
  formBuilderOpen: false,

  loadingSections: false,
  loadingForms: false,
  error: null,

  loadSections: async () => {
    set({ loadingSections: true });
    try {
      const { sections, trashedSections } = await loadAllSections();
      set({ sections, trashedSections, loadingSections: false, error: null });
      // Si la sección activa dejó de existir, se limpia la selección.
      const active = get().activeSectionId;
      if (
        active !== null &&
        !sections.some((section) => section.id === active)
      ) {
        set({
          activeSectionId: null,
          forms: [],
          trashedForms: [],
          activeFormId: null,
          formBuilderOpen: false,
        });
      }
    } catch (error) {
      set({ loadingSections: false, error: toMessage(error) });
    }
  },

  selectSection: async (sectionId) => {
    const changed = get().activeSectionId !== sectionId;
    set({
      activeSectionId: sectionId,
      ...(changed
        ? { activeFormId: null, formBuilderOpen: false }
        : {}),
    });
    await get().loadForms(sectionId);
  },

  createSection: async (input) => {
    const total =
      get().sections.length + get().trashedSections.length;
    const created = await sectionsRepository.create({
      ...input,
      position: input.position ?? total,
    });
    await get().loadSections();
    return created;
  },

  updateSection: async (id, input) => {
    await sectionsRepository.update(id, input);
    await get().loadSections();
  },

  enableSection: async (id) => {
    await sectionsRepository.enable(id);
    await get().loadSections();
  },

  disableSection: async (id) => {
    await sectionsRepository.disable(id);
    await get().loadSections();
  },

  softDeleteSection: async (id) => {
    await sectionsRepository.softDelete(id);
    if (get().activeSectionId === id) {
      set({ activeSectionId: null, forms: [], trashedForms: [], activeFormId: null, formBuilderOpen: false });
    }
    await get().loadSections();
  },

  restoreSection: async (id) => {
    await sectionsRepository.restore(id);
    await get().loadSections();
  },

  hardDeleteSection: async (id) => {
    await sectionsRepository.hardDelete(id);
    if (get().activeSectionId === id) {
      set({ activeSectionId: null, forms: [], trashedForms: [], activeFormId: null, formBuilderOpen: false });
    }
    await get().loadSections();
  },

  moveSection: async (id, delta) => {
    const orderedIds = moveIdInList(
      get().sections.map((section) => section.id),
      id,
      delta,
    );
    if (orderedIds === null) {
      return;
    }
    await sectionsRepository.reorder(orderedIds);
    await get().loadSections();
  },

  loadForms: async (sectionId) => {
    set({ loadingForms: true });
    try {
      const { forms, trashedForms } = await loadSectionForms(sectionId);
      set({ forms, trashedForms, loadingForms: false, error: null });
      const active = get().activeFormId;
      if (active !== null && !forms.some((form) => form.id === active)) {
        set({ activeFormId: null, formBuilderOpen: false });
      }
    } catch (error) {
      set({ loadingForms: false, error: toMessage(error) });
    }
  },

  selectForm: (formId) => {
    set({ activeFormId: formId, formBuilderOpen: false });
  },

  createForm: async (input) => {
    const created = await formsRepository.create(input);
    const sectionId = created.sectionId;
    await get().loadForms(sectionId);
    return created;
  },

  updateForm: async (id, input) => {
    await formsRepository.update(id, input);
    await get().loadForms(get().activeSectionId ?? "");
  },

  enableForm: async (id) => {
    await formsRepository.enable(id);
    await get().loadForms(get().activeSectionId ?? "");
  },

  disableForm: async (id) => {
    await formsRepository.disable(id);
    await get().loadForms(get().activeSectionId ?? "");
  },

  softDeleteForm: async (id) => {
    await formsRepository.softDelete(id);
    if (get().activeFormId === id) {
      set({ activeFormId: null, formBuilderOpen: false });
    }
    await get().loadForms(get().activeSectionId ?? "");
  },

  restoreForm: async (id) => {
    await formsRepository.restore(id);
    await get().loadForms(get().activeSectionId ?? "");
  },

  hardDeleteForm: async (id) => {
    await formsRepository.hardDelete(id);
    if (get().activeFormId === id) {
      set({ activeFormId: null, formBuilderOpen: false });
    }
    await get().loadForms(get().activeSectionId ?? "");
  },

  moveForm: async (id, delta) => {
    const orderedIds = moveIdInList(
      get().forms.map((form) => form.id),
      id,
      delta,
    );
    if (orderedIds === null) {
      return;
    }
    await formsRepository.reorder(orderedIds);
    await get().loadForms(get().activeSectionId ?? "");
  },

  openBuilder: () => {
    set({ formBuilderOpen: true });
  },

  closeBuilder: () => {
    set({ formBuilderOpen: false });
  },
}));
