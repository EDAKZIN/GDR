import type Database from "@tauri-apps/plugin-sql";
import { z } from "zod";
import {
  createFieldInputSchema,
  reorderInputSchema,
  updateFieldInputSchema,
  type CreateFieldInput,
  type Field,
  type ReorderInput,
  type UpdateFieldInput,
} from "../../core/fields";
import { randomUUID } from "../../core/utils/uuid";
import {
  appendSet,
  boolToDb,
  dbEnabled,
  listWhere,
  nowIso,
  type DbHandle,
  type ListOptions,
} from "./shared";

interface FieldRow {
  id: string;
  formId: string;
  name: string;
  description: string | null;
  type: string;
  required: number;
  searchable: number;
  position: number;
  enabled: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const fieldRowSchema = z
  .object({
    id: z.uuid(),
    formId: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    // TEXT flexible en DB (sin CHECK rígido); la lista válida vive en FIELD_TYPES.
    type: z.string().min(1),
    required: dbEnabled,
    searchable: dbEnabled,
    position: z.number().int(),
    enabled: dbEnabled,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .transform((row): Field => ({
    id: row.id,
    formId: row.formId,
    name: row.name,
    description: row.description,
    type: row.type,
    required: row.required,
    searchable: row.searchable,
    position: row.position,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }));

const FIELD_COLUMNS =
  "id, form_id AS formId, name, description, type, required, searchable, position, enabled, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt";

function parseFields(rows: FieldRow[]): Field[] {
  return z.array(fieldRowSchema).parse(rows);
}

export interface FieldRepository {
  create(input: CreateFieldInput): Promise<Field>;
  get(id: string): Promise<Field | null>;
  list(options?: ListOptions): Promise<Field[]>;
  listByForm(formId: string, options?: ListOptions): Promise<Field[]>;
  update(id: string, input: UpdateFieldInput): Promise<Field>;
  disable(id: string): Promise<Field>;
  enable(id: string): Promise<Field>;
  softDelete(id: string): Promise<Field>;
  restore(id: string): Promise<Field>;
  hardDelete(id: string): Promise<boolean>;
  /** Fija position = índice para cada id, en el orden dado (dentro de su formulario). */
  reorder(orderedIds: ReorderInput): Promise<void>;
}

export function createFieldsRepository(db: DbHandle): FieldRepository {
  async function getRow(database: Database, id: string): Promise<Field | null> {
    const rows = await database.select<FieldRow[]>(
      `SELECT ${FIELD_COLUMNS} FROM fields WHERE id = $1`,
      [z.uuid().parse(id)],
    );
    if (rows.length === 0) {
      return null;
    }
    return fieldRowSchema.parse(rows[0]);
  }

  async function requireRow(database: Database, id: string): Promise<Field> {
    const field = await getRow(database, id);
    if (field === null) {
      throw new Error(`Campo no encontrado: ${id}`);
    }
    return field;
  }

  async function setFlags(
    database: Database,
    id: string,
    flags: { enabled?: boolean; deleted?: boolean },
  ): Promise<Field> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (flags.enabled !== undefined) {
      appendSet(sets, params, "enabled", boolToDb(flags.enabled));
    }
    if (flags.deleted !== undefined) {
      appendSet(sets, params, "deleted_at", flags.deleted ? nowIso() : null);
    }
    if (sets.length === 0) {
      return requireRow(database, id);
    }
    appendSet(sets, params, "updated_at", nowIso());
    params.push(id);
    await database.execute(
      `UPDATE fields SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
      params,
    );
    return requireRow(database, id);
  }

  return {
    async create(input: CreateFieldInput): Promise<Field> {
      const data = createFieldInputSchema.parse(input);
      const id = randomUUID();
      const database = await db();
      await database.execute(
        "INSERT INTO fields (id, form_id, name, description, type, required, searchable, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          id,
          data.formId,
          data.name,
          data.description ?? null,
          data.type,
          boolToDb(data.required ?? false),
          boolToDb(data.searchable ?? false),
          data.position ?? 0,
        ],
      );
      return requireRow(database, id);
    },

    async get(id: string): Promise<Field | null> {
      return getRow(await db(), z.uuid().parse(id));
    },

    async list(options?: ListOptions): Promise<Field[]> {
      const database = await db();
      const rows = await database.select<FieldRow[]>(
        `SELECT ${FIELD_COLUMNS} FROM fields ${listWhere(options)} ORDER BY position, name`,
      );
      return parseFields(rows);
    },

    async listByForm(formId: string, options?: ListOptions): Promise<Field[]> {
      const database = await db();
      const baseWhere = listWhere(options);
      const where =
        baseWhere.length > 0 ? `${baseWhere} AND form_id = $1` : "WHERE form_id = $1";
      const rows = await database.select<FieldRow[]>(
        `SELECT ${FIELD_COLUMNS} FROM fields ${where} ORDER BY position, name`,
        [z.uuid().parse(formId)],
      );
      return parseFields(rows);
    },

    async update(id: string, input: UpdateFieldInput): Promise<Field> {
      const data = updateFieldInputSchema.parse(input);
      const database = await db();
      const sets: string[] = [];
      const params: unknown[] = [];
      if (data.name !== undefined) {
        appendSet(sets, params, "name", data.name);
      }
      if (data.description !== undefined) {
        appendSet(sets, params, "description", data.description ?? null);
      }
      if (data.type !== undefined) {
        appendSet(sets, params, "type", data.type);
      }
      if (data.required !== undefined) {
        appendSet(sets, params, "required", boolToDb(data.required));
      }
      if (data.searchable !== undefined) {
        appendSet(sets, params, "searchable", boolToDb(data.searchable));
      }
      if (data.position !== undefined) {
        appendSet(sets, params, "position", data.position);
      }
      if (sets.length === 0) {
        return requireRow(database, z.uuid().parse(id));
      }
      appendSet(sets, params, "updated_at", nowIso());
      params.push(z.uuid().parse(id));
      await database.execute(
        `UPDATE fields SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
        params,
      );
      return requireRow(database, z.uuid().parse(id));
    },

    async disable(id: string): Promise<Field> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { enabled: false });
    },

    async enable(id: string): Promise<Field> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { enabled: true });
    },

    async softDelete(id: string): Promise<Field> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { deleted: true });
    },

    async restore(id: string): Promise<Field> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { deleted: false });
    },

    async hardDelete(id: string): Promise<boolean> {
      const database = await db();
      const result = await database.execute("DELETE FROM fields WHERE id = $1", [
        z.uuid().parse(id),
      ]);
      return result.rowsAffected > 0;
    },

    async reorder(orderedIds: ReorderInput): Promise<void> {
      const ids = reorderInputSchema.parse(orderedIds);
      const database = await db();
      for (const [index, id] of ids.entries()) {
        await database.execute(
          "UPDATE fields SET position = $1, updated_at = $2 WHERE id = $3",
          [index, nowIso(), id],
        );
      }
    },
  };
}

