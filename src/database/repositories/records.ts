import type Database from "@tauri-apps/plugin-sql";
import { z } from "zod";
import {
  deserializeFieldValue,
  serializeFieldValue,
} from "../../core/fields/values";
import {
  createRecordInputSchema,
  listByFormOptionsSchema,
  recordDetailSchema,
  updateValuesInputSchema,
  type ListByFormOptions,
  type RecordDetail,
  type RecordEntity,
  type UpdateValuesInput,
} from "../../core/records";
import { randomUUID } from "../../core/utils/uuid";
import {
  appendSet,
  boolToDb,
  dbEnabled,
  nowIso,
  type DbHandle,
} from "./shared";

interface RecordRow {
  id: string;
  formId: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface FieldValueRow {
  id: string;
  recordId: string;
  fieldId: string;
  value: string | null;
  createdAt: string;
  updatedAt: string;
}

const recordRowSchema = z
  .object({
    id: z.uuid(),
    formId: z.uuid(),
    enabled: dbEnabled,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullable(),
  })
  .transform((row): RecordEntity => ({
    id: row.id,
    formId: row.formId,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }));

function parseRecords(rows: RecordRow[]): RecordEntity[] {
  return z.array(recordRowSchema).parse(rows);
}

const RECORD_COLUMNS =
  "id, form_id AS formId, enabled, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt";

export interface RecordRepository {
  /** Crea el registro y, opcionalmente, sus valores iniciales (JSON serializado). */
  create(input: {
    formId: string;
    values?: UpdateValuesInput;
  }): Promise<RecordEntity>;
  /** Devuelve el registro con sus valores ya deserializados. */
  get(id: string): Promise<RecordDetail | null>;
  /** Upsert de valores indexados por field_id. */
  updateValues(recordId: string, values: UpdateValuesInput): Promise<void>;
  softDelete(id: string): Promise<RecordEntity>;
  restore(id: string): Promise<RecordEntity>;
  hardDelete(id: string): Promise<boolean>;
  listByForm(
    formId: string,
    options?: ListByFormOptions,
  ): Promise<RecordEntity[]>;
}

export function createRecordsRepository(db: DbHandle): RecordRepository {
  async function getRow(
    database: Database,
    id: string,
  ): Promise<RecordEntity | null> {
    const rows = await database.select<RecordRow[]>(
      `SELECT ${RECORD_COLUMNS} FROM records WHERE id = $1`,
      [z.uuid().parse(id)],
    );
    if (rows.length === 0) {
      return null;
    }
    return recordRowSchema.parse(rows[0]);
  }

  async function requireRow(
    database: Database,
    id: string,
  ): Promise<RecordEntity> {
    const record = await getRow(database, id);
    if (record === null) {
      throw new Error(`Registro no encontrado: ${id}`);
    }
    return record;
  }

  async function upsertValues(
    database: Database,
    recordId: string,
    values: UpdateValuesInput,
  ): Promise<void> {
    const parsed = updateValuesInputSchema.parse(values);
    const timestamp = nowIso();
    for (const [fieldId, value] of Object.entries(parsed)) {
      await database.execute(
        `INSERT INTO field_values (id, record_id, field_id, value, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (record_id, field_id)
         DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [randomUUID(), recordId, z.uuid().parse(fieldId), serializeFieldValue(value), timestamp],
      );
    }
  }

  async function loadValues(
    database: Database,
    recordId: string,
  ): Promise<Array<{ fieldId: string; value: unknown }>> {
    const rows = await database.select<FieldValueRow[]>(
      "SELECT id, record_id AS recordId, field_id AS fieldId, value, created_at AS createdAt, updated_at AS updatedAt FROM field_values WHERE record_id = $1",
      [recordId],
    );
    return rows.map((row) => ({
      fieldId: row.fieldId,
      value: deserializeFieldValue(row.value),
    }));
  }

  async function setFlags(
    database: Database,
    id: string,
    flags: { enabled?: boolean; deleted?: boolean },
  ): Promise<RecordEntity> {
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
      `UPDATE records SET ${sets.join(", ")} WHERE id = $${String(params.length)}`,
      params,
    );
    return requireRow(database, id);
  }

  return {
    async create(input): Promise<RecordEntity> {
      const data = createRecordInputSchema.parse(input);
      const id = randomUUID();
      const database = await db();
      await database.execute("INSERT INTO records (id, form_id) VALUES ($1, $2)", [
        id,
        data.formId,
      ]);
      if (data.values !== undefined) {
        await upsertValues(database, id, data.values);
      }
      return requireRow(database, id);
    },

    async get(id): Promise<RecordDetail | null> {
      const database = await db();
      const record = await getRow(database, z.uuid().parse(id));
      if (record === null) {
        return null;
      }
      const values = await loadValues(database, record.id);
      return recordDetailSchema.parse({ ...record, values });
    },

    async updateValues(recordId, values): Promise<void> {
      const database = await db();
      await requireRow(database, z.uuid().parse(recordId));
      await upsertValues(database, z.uuid().parse(recordId), values);
    },

    async softDelete(id): Promise<RecordEntity> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { deleted: true });
    },

    async restore(id): Promise<RecordEntity> {
      const database = await db();
      return setFlags(database, z.uuid().parse(id), { deleted: false });
    },

    async hardDelete(id): Promise<boolean> {
      const database = await db();
      const result = await database.execute("DELETE FROM records WHERE id = $1", [
        z.uuid().parse(id),
      ]);
      return result.rowsAffected > 0;
    },

    async listByForm(formId, options): Promise<RecordEntity[]> {
      const parsedOptions = listByFormOptionsSchema.parse(options ?? {});
      const clauses: string[] = ["form_id = $1"];
      if (!parsedOptions.includeDeleted) {
        clauses.push("deleted_at IS NULL");
      }
      if (!parsedOptions.includeDisabled) {
        clauses.push("enabled = 1");
      }
      const database = await db();
      const rows = await database.select<RecordRow[]>(
        `SELECT ${RECORD_COLUMNS} FROM records WHERE ${clauses.join(" AND ")} ORDER BY ${parsedOptions.orderBy} ${parsedOptions.direction}`,
        [z.uuid().parse(formId)],
      );
      return parseRecords(rows);
    },
  };
}

