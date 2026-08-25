import { create } from "zustand";
import type { CreateFormInput, Form, UpdateFormInput } from "../core/forms";
import type { CreateSectionInput, Section, UpdateSectionInput } from "../core/sections";
import { getDb } from "../database/client";
import { createFormsRepository, createSectionsRepository } from "../database/repositories";
import { useUiStore } from "./useUiStore";

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
  /** Nº de formularios (no eliminados) por id de sección. */
  formCounts: Record<string, number>;

  /** Formularios de la sección activa NO eliminados. */
  forms: Form[];
  /** Formularios eliminados de la sección activa. */
  trashedForms: Form[];
  activeFormId: string | null;

  loadingSections: boolean;
  loadingForms: boolean;
  error: string | null;

  loadSections: () => Promise<void>;
  loadFormCounts: () => Promise<void>;
  selectSection: (sectionId: string) => Promise<void>;
  /** Hijas directas (no eliminadas) de un padre; null = raíces. */
  childrenOf: (parentId: string | null) => Section[];

  createSection: (input: CreateSectionInput) => Promise<Section>;
  /**
   * Backfill idempotente: para cada sección viva allowChildren=false sin
   * formularios vivos, crea el formulario homónimo (descripción vacía).
   * Devuelve cuántos formularios creó.
   */
  ensureFlatSectionForms: () => Promise<number>;
  updateSection: (id: string, input: UpdateSectionInput) => Promise<void>;
  enableSection: (id: string) => Promise<void>;
  disableSection: (id: string) => Promise<void>;
  softDeleteSection: (id: string) => Promise<void>;
  restoreSection: (id: string) => Promise<void>;
  hardDeleteSection: (id: string) => Promise<void>;
  moveSection: (id: string, delta: -1 | 1) => Promise<void>;
  /** Reubica una sección bajo otro padre (null = raíz), sin ciclos. */
  moveSectionTo: (id: string, newParentId: string | null) => Promise<void>;
  /** Alterna «Permitir sub-secciones»; falla si tiene hijas vivas. */
  toggleAllowChildren: (id: string) => Promise<void>;

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
  formCounts: {},

  forms: [],
  trashedForms: [],
  activeFormId: null,

  loadingSections: false,
  loadingForms: false,
  error: null,

  loadSections: async () => {
    set({ loadingSections: true });
    try {
      const { sections, trashedSections } = await loadAllSections();
      set({ sections, trashedSections, loadingSections: false, error: null });
      void get().loadFormCounts();
      // Si la sección activa dejó de existir, se limpia la selección.
      const active = get().activeSectionId;
      if (active !== null && !sections.some((section) => section.id === active)) {
        set({
          activeSectionId: null,
          forms: [],
          trashedForms: [],
          activeFormId: null,
        });
      }
    } catch (error) {
      set({ loadingSections: false, error: toMessage(error) });
    }
  },

  loadFormCounts: async () => {
    try {
      const allForms = await formsRepository.list({ includeDisabled: true });
      const formCounts: Record<string, number> = {};
      for (const form of allForms) {
        formCounts[form.sectionId] = (formCounts[form.sectionId] ?? 0) + 1;
      }
      set({ formCounts });
    } catch (error) {
      set({ error: toMessage(error) });
    }
  },

  selectSection: async (sectionId) => {
    const changed = get().activeSectionId !== sectionId;
    set({
      activeSectionId: sectionId,
      ...(changed ? { activeFormId: null } : {}),
    });
    await get().loadForms(sectionId);
  },

  childrenOf: (parentId) =>
    get().sections.filter((section) => (section.parentId ?? null) === parentId),

  createSection: async (input) => {
    const total = get().sections.length + get().trashedSections.length;
    const created = await sectionsRepository.create({
      ...input,
      position: input.position ?? total,
    });
    // Sección plana: el formulario homónimo se crea automáticamente e
    // invisible para el usuario (sin pedir nombre ni plantilla).
    if (!created.allowChildren) {
      await formsRepository.create({
        sectionId: created.id,
        name: created.name,
        description: null,
      });
    }
    await get().loadSections();
    return created;
  },

  ensureFlatSectionForms: async () => {
    try {
      const [liveSections, liveForms] = await Promise.all([
        sectionsRepository.list({ includeDisabled: true }),
        formsRepository.list({ includeDisabled: true }),
      ]);
      const sectionsWithForms = new Set(liveForms.map((form) => form.sectionId));
      const orphans = liveSections.filter(
        (section) => !section.allowChildren && !sectionsWithForms.has(section.id),
      );
      for (const section of orphans) {
        await formsRepository.create({
          sectionId: section.id,
          name: section.name,
          description: null,
        });
      }
      if (orphans.length > 0) {
        console.info(
          `Backfill secciones planas: ${String(orphans.length)} formulario(s) homónimo(s) creado(s).`,
        );
        await Promise.all([get().loadSections(), get().loadFormCounts()]);
      }
      return orphans.length;
    } catch (error) {
      console.error("Backfill de secciones planas falló:", error);
      return 0;
    }
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
      set({ activeSectionId: null, forms: [], trashedForms: [], activeFormId: null });
      // La sección activa ya no existe: volver al nivel superior siempre.
      useUiStore.getState().navigate("home");
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
      set({ activeSectionId: null, forms: [], trashedForms: [], activeFormId: null });
      // La sección activa ya no existe: volver al nivel superior siempre.
      useUiStore.getState().navigate("home");
    }
    await get().loadSections();
  },

  moveSection: async (id, delta) => {
    // El reordenamiento por delta ocurre SOLO entre hermanas del mismo padre.
    const current = get().sections.find((section) => section.id === id);
    if (current === undefined) {
      return;
    }
    const parentId = current.parentId ?? null;
    const siblingIds = get()
      .sections.filter((section) => (section.parentId ?? null) === parentId)
      .map((section) => section.id);
    const orderedIds = moveIdInList(siblingIds, id, delta);
    if (orderedIds === null) {
      return;
    }
    await sectionsRepository.reorder(orderedIds);
    await get().loadSections();
  },

  moveSectionTo: async (id, newParentId) => {
    await sectionsRepository.move(id, newParentId);
    await get().loadSections();
  },

  toggleAllowChildren: async (id) => {
    const current = get().sections.find((section) => section.id === id);
    if (current === undefined) {
      return;
    }
    // El repositorio valida y lanza mensajes claros (p. ej. con hijas vivas).
    await sectionsRepository.update(id, {
      allowChildren: !current.allowChildren,
    });
    await get().loadSections();
  },

  loadForms: async (sectionId) => {
    set({ loadingForms: true });
    try {
      const { forms, trashedForms } = await loadSectionForms(sectionId);
      set({ forms, trashedForms, loadingForms: false, error: null });
      const active = get().activeFormId;
      if (active !== null && !forms.some((form) => form.id === active)) {
        set({ activeFormId: null });
      }
    } catch (error) {
      set({ loadingForms: false, error: toMessage(error) });
    }
  },

  selectForm: (formId) => {
    set({ activeFormId: formId });
  },

  createForm: async (input) => {
    const created = await formsRepository.create(input);
    const sectionId = created.sectionId;
    await get().loadForms(sectionId);
    void get().loadFormCounts();
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
      set({ activeFormId: null });
      // Si el formulario borrado era el visible en su workspace, volver a la sección.
      if (useUiStore.getState().view === "form") {
        useUiStore.getState().goBack();
      }
    }
    await get().loadForms(get().activeSectionId ?? "");
    void get().loadFormCounts();
  },

  restoreForm: async (id) => {
    await formsRepository.restore(id);
    await get().loadForms(get().activeSectionId ?? "");
    void get().loadFormCounts();
  },

  hardDeleteForm: async (id) => {
    await formsRepository.hardDelete(id);
    if (get().activeFormId === id) {
      set({ activeFormId: null });
      // Si el formulario borrado era el visible en su workspace, volver a la sección.
      if (useUiStore.getState().view === "form") {
        useUiStore.getState().goBack();
      }
    }
    await get().loadForms(get().activeSectionId ?? "");
    void get().loadFormCounts();
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
}));

export interface SectionNode {
  section: Section;
  children: SectionNode[];
}

/**
 * Árbol jerárquico derivado de una lista plana de secciones.
 * `parentId` fija la raíz del árbol (null = secciones raíz).
 */
export function buildSectionTree(
  sections: readonly Section[],
  parentId: string | null = null,
): SectionNode[] {
  const byParent = new Map<string | null, Section[]>();
  for (const section of sections) {
    const key = section.parentId ?? null;
    const bucket = byParent.get(key);
    if (bucket !== undefined) {
      bucket.push(section);
    } else {
      byParent.set(key, [section]);
    }
  }
  function build(key: string | null): SectionNode[] {
    return (byParent.get(key) ?? []).map((section) => ({
      section,
      children: build(section.id),
    }));
  }
  return build(parentId);
}
