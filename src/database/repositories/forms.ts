import type Database from "@tauri-apps/plugin-sql";
import { z } from "zod";
import {
  createFormInputSchema,
  reorderInputSchema,
  updateFormInputSchema,
  type CreateFormInput,
  type Form,
  type ReorderInput,
  type UpdateFormInput,
} from "../../core/forms";
import { randomUUID } from "../../core/utils/uuid";
import {
  appendSet,
  boolToDb,
  dbEnabled,
  listWhere,
  nowIso,
  reorderAtomically,
  type DbHandle,
  type ListOptions,
} from "./shared";

interface FormRow {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  position: number;
  enabled: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const formRowSchema = z
  .object({
    id: z.uuid(),
    sectionId: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    position: z.number().int(),
    enabled: dbEnabled,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .transform((row): Form => ({
    id: row.id,
    sectionId: row.sectionId,
    name: row.name,
    description: row.description,
    position: row.position,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }));

const FORM_COLUMNS =
  "id, section_id AS sectionId, name, description, position, enabled, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt";

function parseForms(rows: FormRow[]): Form[] {
  return z.array(formRowSchema).parse(rows);
}

export interface FormRepository {
  create(input: CreateFormInput): Promise<Form>;
  get(id: string): Promise<Form | null>;
  list(options?: ListOptions): Promise<Form[]>;
  listBySection(sectionId: string, options?: ListOptions): Promise<Form[]>;
  update(id: string, input: UpdateFormInput): Promise<Form>;
  disable(id: string): Promise<Form>;
  enable(id: string): Promise<Form>;
  softDelete(id: string): Promise<Form>;
  restore(id: string): Promise<Form>;
  hardDelete(id: string): Promise<boolean>;
  /** Fija position = índice para cada id, en el orden dado (dentro de su sección). */
  reorder(orderedIds: ReorderInput): Promise<void>;
}

export function createFormsRepository(db: DbHandle): FormRepository {
  async function getRow(database: Database, id: string): Promise<Form | null> {
    const rows = await database.select<FormRow[]>(
      `SELECT ${FORM_COLUMNS} FROM forms WHERE id = $1`,
      [z.uuid().parse(id)],
    );
    if (rows.length === 0) {
      return null;
    }
    return formRowSchema.parse(rows[0]);
  }

  async function requireRow(database: Database, id: string): Promise<Form> {
    const form = await getRow(database, id);
    if (form === null) {
      throw new Error(`Formulario no encontrado: ${id}`);
    }
    return form;
  }

  async function setFlags(
    database: Database,
    id: string,
    flags: { enabled?: boolean; deleted?: boolean },
  ): Promise<Form> {
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
      `UPDATE forms SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
      params,
    );
    return requireRow(database, id);
  }

  return {
    async create(input: CreateFormInput): Promise<Form> {
      const data = createFormInputSchema.parse(input);
      const id = randomUUID();
      const database = await db();
      let position = data.position;
      if (position === undefined) {
        // Sin posición explícita, el formulario se añade al FINAL del orden.
        const rows = await database.select<Array<{ next: number }>>(
          "SELECT COALESCE(MAX(position) + 1, 0) AS next FROM forms WHERE section_id = $1",
          [data.sectionId],
        );
        position = rows[0]?.next ?? 0;
      }
      await database.execute(
        "INSERT INTO forms (id, section_id, name, description, position) VALUES ($1, $2, $3, $4, $5)",
        [
          id,
          data.sectionId,
          data.name,
          data.description ?? null,
          position,
        ],
      );
      return requireRow(database, id);
    },

    async get(id: string): Promise<Form | null> {
      return getRow(await db(), z.uuid().parse(id));
    },

    async list(options?: ListOptions): Promise<Form[]> {
      const database = await db();
      const rows = await database.select<FormRow[]>(
        `SELECT ${FORM_COLUMNS} FROM forms ${listWhere(options)} ORDER BY position, name`,
      );
      return parseForms(rows);
    },

    async listBySection(sectionId: string, options?: ListOptions): Promise<Form[]> {
      const database = await db();
      const baseWhere = listWhere(options);
      const where =
        baseWhere.length > 0
          ? `${baseWhere} AND section_id = $1`
          : "WHERE section_id = $1";
      const rows = await database.select<FormRow[]>(
        `SELECT ${FORM_COLUMNS} FROM forms ${where} ORDER BY position, name`,
        [z.uuid().parse(sectionId)],
      );
      return parseForms(rows);
    },

    async update(id: string, input: UpdateFormInput): Promise<Form> {
      const data = updateFormInputSchema.parse(input);
      const database = await db();
      const sets: string[] = [];
      const params: unknown[] = [];
      if (data.name !== undefined) {
        appendSet(sets, params, "name", data.name);
      }
      if (data.description !== undefined) {
        appendSet(sets, params, "description", data.description ?? null);
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
        `UPDATE forms SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
        params,
      );
      return requireRow(database, z.uuid().parse(id));
    },

    async disable(id: string): Promise<Form> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { enabled: false });
    },

    async enable(id: string): Promise<Form> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { enabled: true });
    },

    async softDelete(id: string): Promise<Form> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { deleted: true });
    },

    async restore(id: string): Promise<Form> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { deleted: false });
    },

    async hardDelete(id: string): Promise<boolean> {
      const database = await db();
      const result = await database.execute("DELETE FROM forms WHERE id = $1", [
        z.uuid().parse(id),
      ]);
      return result.rowsAffected > 0;
    },

    async reorder(orderedIds: ReorderInput): Promise<void> {
      const ids = reorderInputSchema.parse(orderedIds);
      const database = await db();
      await reorderAtomically(database, "forms", ids);
    },
  };
}

