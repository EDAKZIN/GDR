import { create } from "zustand";
import { validateFieldValue, type Field } from "../core/fields";
import { translate } from "../i18n";
import type {
  FieldValue,
  RecordDetail,
  RecordEntity,
  RecordOrderBy,
  RecordOrderDirection,
} from "../core/records";
import { getDb } from "../database/client";
import {
  createFieldsRepository,
  createRecordsRepository,
} from "../database/repositories";

const fieldsRepository = createFieldsRepository(getDb);
const recordsRepository = createRecordsRepository(getDb);

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Título de un registro: primer campo text habilitado con valor no vacío. */
export function resolveRecordTitle(
  fields: Field[],
  values: readonly { fieldId: string; value: unknown }[],
): string {
  const byField = new Map<string, unknown>(
    values.map((entry) => [entry.fieldId, entry.value]),
  );
  for (const field of fields) {
    if (field.type !== "text") {
      continue;
    }
    const value = byField.get(field.id);
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return translate("registros.sinTitulo");
}

export interface RecordListItem {
  record: RecordEntity;
  title: string;
  /** Valores deserializados (para tarjetas y búsqueda local). */
  values: FieldValue[];
}

export type RecordViewMode = "closed" | "view" | "edit" | "create";

interface RecordState {
  formId: string | null;
  fields: Field[];
  /** Registros VIVOS del formulario (nunca mezclados con la papelera). */
  items: RecordListItem[];
  /** Registros ELIMINADOS del formulario (papelera). */
  trashedItems: RecordListItem[];
  orderBy: RecordOrderBy;
  direction: RecordOrderDirection;
  showDeleted: boolean;
  loading: boolean;
  error: string | null;

  activeMode: RecordViewMode;
  activeId: string | null;
  activeDetail: RecordDetail | null;
  /** Valores en edición/creación indexados por field_id (ya deserializados). */
  draft: Record<string, unknown>;
  /** Errores de validación por field_id. */
  errors: Record<string, string>;
  saving: boolean;

  openForm: (formId: string) => Promise<void>;
  closeForm: () => void;
  /** Recarga campos (tras editar la plantilla) y la lista de registros. */
  reloadFields: () => Promise<void>;
  reloadList: () => Promise<void>;
  setSorting: (sorting: {
    orderBy?: RecordOrderBy;
    direction?: RecordOrderDirection;
  }) => void;
  setShowDeleted: (show: boolean) => void;

  openCreate: () => void;
  openRecord: (recordId: string) => Promise<void>;
  startEditing: () => void;
  closeActive: () => void;
  setDraftValue: (fieldId: string, value: unknown) => void;
  saveActive: () => Promise<boolean>;

  deleteItem: (recordId: string) => Promise<void>;
  deleteActive: () => Promise<void>;
  restoreItem: (recordId: string) => Promise<void>;
  /** Borrado definitivo de un registro en papelera (irreversible). */
  hardDeleteRecord: (recordId: string) => Promise<void>;
}

interface LoadItemsOptions {
  formId: string;
  fields: Field[];
  orderBy: RecordOrderBy;
  direction: RecordOrderDirection;
}

async function toListItems(
  records: RecordEntity[],
  fields: Field[],
): Promise<RecordListItem[]> {
  return Promise.all(
    records.map(async (record) => {
      const detail = await recordsRepository.get(record.id);
      return {
        record,
        values: detail?.values ?? [],
        title:
          detail === null
            ? translate("registros.sinTitulo")
            : resolveRecordTitle(fields, detail.values),
      };
    }),
  );
}

/**
 * Carga por separado vivos y eliminados del formulario: la papelera nunca
 * se mezcla con la lista activa (items vs trashedItems).
 */
async function loadLists(
  options: LoadItemsOptions,
): Promise<{ items: RecordListItem[]; trashedItems: RecordListItem[] }> {
  const base = { orderBy: options.orderBy, direction: options.direction };
  const [live, all] = await Promise.all([
    recordsRepository.listByForm(options.formId, base),
    recordsRepository.listByForm(options.formId, { ...base, includeDeleted: true }),
  ]);
  const [items, trashedItems] = await Promise.all([
    toListItems(live, options.fields),
    toListItems(all.filter((record) => record.deletedAt !== null), options.fields),
  ]);
  return { items, trashedItems };
}

/**
 * Contador de cargas de lista/campos: si dos openForm/reloadList se solapan
 * (cambio rápido de formulario), solo la MÁS RECIENTE puede escribir estado;
 * las respuestas tardías se descartan para no mezclar datos entre formularios.
 */
let listLoadSeq = 0;

export const useRecordStore = create<RecordState>()((set, get) => ({
  formId: null,
  fields: [],
  items: [],
  trashedItems: [],
  orderBy: "created_at",
  direction: "desc",
  showDeleted: false,
  loading: false,
  error: null,

  activeMode: "closed",
  activeId: null,
  activeDetail: null,
  draft: {},
  errors: {},
  saving: false,

  openForm: async (formId) => {
    const seq = ++listLoadSeq;
    set({
      formId,
      loading: true,
      error: null,
      items: [],
      trashedItems: [],
      activeMode: "closed",
      activeId: null,
      activeDetail: null,
      draft: {},
      errors: {},
    });
    try {
      const fields = await fieldsRepository.listByForm(formId);
      if (seq !== listLoadSeq || get().formId !== formId) {
        // Llegó tarde: otra carga más reciente ya tomó el control del estado.
        return;
      }
      set({ fields });
      await get().reloadList();
    } catch (error) {
      if (seq !== listLoadSeq || get().formId !== formId) {
        return;
      }
      set({ loading: false, error: toMessage(error) });
    }
  },

  closeForm: () => {
    // Invalida cualquier carga en vuelo del formulario cerrado.
    listLoadSeq += 1;
    set({
      formId: null,
      fields: [],
      items: [],
      trashedItems: [],
      activeMode: "closed",
      activeId: null,
      activeDetail: null,
      draft: {},
      errors: {},
      error: null,
    });
  },

  reloadFields: async () => {
    const { formId } = get();
    if (formId === null) {
      return;
    }
    try {
      const fields = await fieldsRepository.listByForm(formId);
      if (get().formId !== formId) {
        return;
      }
      set({ fields });
      await get().reloadList();
    } catch (error) {
      if (get().formId !== formId) {
        return;
      }
      set({ error: toMessage(error) });
    }
  },

  reloadList: async () => {
    const state = get();
    if (state.formId === null) {
      return;
    }
    const targetFormId = state.formId;
    const seq = ++listLoadSeq;
    set({ loading: true });
    try {
      const { items, trashedItems } = await loadLists({
        formId: targetFormId,
        fields: state.fields,
        orderBy: state.orderBy,
        direction: state.direction,
      });
      if (seq !== listLoadSeq || get().formId !== targetFormId) {
        // Llegó tarde: otra carga más reciente ya tomó el control del estado.
        return;
      }
      set({ items, trashedItems, loading: false, error: null });
    } catch (error) {
      if (seq !== listLoadSeq || get().formId !== targetFormId) {
        return;
      }
      set({ loading: false, error: toMessage(error) });
    }
  },

  setSorting: (sorting) => {
    set({
      orderBy: sorting.orderBy ?? get().orderBy,
      direction: sorting.direction ?? get().direction,
    });
    void get().reloadList();
  },

  setShowDeleted: (show) => {
    set({ showDeleted: show });
    void get().reloadList();
  },

  openCreate: () => {
    set({
      activeMode: "create",
      activeId: null,
      activeDetail: null,
      draft: {},
      errors: {},
    });
  },

  openRecord: async (recordId) => {
    set({ loading: true, error: null });
    try {
      const detail = await recordsRepository.get(recordId);
      if (detail === null) {
        throw new Error(`Registro no encontrado: ${recordId}`);
      }
      set({
        loading: false,
        activeMode: "view",
        activeId: detail.id,
        activeDetail: detail,
        draft: Object.fromEntries(
          detail.values.map((entry) => [entry.fieldId, entry.value]),
        ),
        errors: {},
      });
    } catch (error) {
      set({ loading: false, error: toMessage(error) });
    }
  },

  startEditing: () => {
    const { activeDetail } = get();
    if (activeDetail === null) {
      return;
    }
    set({
      activeMode: "edit",
      activeId: activeDetail.id,
      activeDetail,
      draft: Object.fromEntries(
        activeDetail.values.map((entry) => [entry.fieldId, entry.value]),
      ),
      errors: {},
    });
  },

  closeActive: () => {
    set({
      activeMode: "closed",
      activeId: null,
      activeDetail: null,
      draft: {},
      errors: {},
    });
  },

  setDraftValue: (fieldId, value) => {
    set((state) => {
      // Omit-pattern en vez de `delete` dinámico.
      const { [fieldId]: _removed, ...errors } = state.errors;
      return { draft: { ...state.draft, [fieldId]: value }, errors };
    });
  },

  saveActive: async () => {
    const state = get();
    const { formId, fields, activeMode, activeId, draft } = state;
    if (formId === null || (activeMode !== "edit" && activeMode !== "create")) {
      return false;
    }
    if (activeMode === "edit" && activeId === null) {
      return false;
    }

    const errors: Record<string, string> = {};
    for (const field of fields) {
      const message = validateFieldValue(field, draft[field.id]);
      if (message !== null) {
        errors[field.id] = message;
      }
    }
    if (Object.keys(errors).length > 0) {
      set({ errors });
      return false;
    }

    const liveFieldIds = new Set(fields.map((field) => field.id));
    const payload = Object.fromEntries(
      fields
        .filter((field) => liveFieldIds.has(field.id))
        .map((field) => {
          const raw = draft[field.id];
          const value =
            field.type === "boolean" && (raw === null || raw === undefined)
              ? false
              : raw;
          return [field.id, value];
        }),
    );

    set({ saving: true, error: null });
    try {
      let savedId: string;
      if (activeMode === "edit" && activeId !== null) {
        await recordsRepository.updateValues(activeId, payload);
        savedId = activeId;
      } else {
        const created = await recordsRepository.create({ formId, values: payload });
        savedId = created.id;
      }
      const detail = await recordsRepository.get(savedId);
      if (detail === null) {
        throw new Error(translate("registros.errorRecargar"));
      }
      await get().reloadList();
      set({
        saving: false,
        errors: {},
        activeMode: "view",
        activeId: detail.id,
        activeDetail: detail,
        draft: {},
      });
      return true;
    } catch (error) {
      set({ saving: false, error: toMessage(error) });
      return false;
    }
  },

  deleteItem: async (recordId) => {
    try {
      await recordsRepository.softDelete(recordId);
      if (get().activeId === recordId) {
        get().closeActive();
      }
      await get().reloadList();
    } catch (error) {
      set({ error: toMessage(error) });
    }
  },

  deleteActive: async () => {
    const { activeId } = get();
    if (activeId === null) {
      return;
    }
    await get().deleteItem(activeId);
  },

  restoreItem: async (recordId) => {
    try {
      await recordsRepository.restore(recordId);
      await get().reloadList();
    } catch (error) {
      set({ error: toMessage(error) });
    }
  },

  hardDeleteRecord: async (recordId) => {
    try {
      await recordsRepository.hardDelete(recordId);
      if (get().activeId === recordId) {
        get().closeActive();
      }
      await get().reloadList();
    } catch (error) {
      set({ error: toMessage(error) });
    }
  },
}));
