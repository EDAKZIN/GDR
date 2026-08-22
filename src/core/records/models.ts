import { z } from "zod";

/**
 * "Record" colisiona con utilidades globales, por eso la entidad se llama
 * RecordEntity.
 */
export const recordEntitySchema = z.object({
  id: z.uuid(),
  formId: z.uuid(),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export type RecordEntity = z.infer<typeof recordEntitySchema>;

export const fieldValueSchema = z.object({
  id: z.uuid(),
  recordId: z.uuid(),
  fieldId: z.uuid(),
  // Texto serializado (JSON) según el tipo de campo; ver core/fields/values.ts
  value: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type FieldValueRow = z.infer<typeof fieldValueSchema>;

/** Valor ya deserializado para un campo de un registro. */
export interface FieldValue {
  fieldId: string;
  value: unknown;
}

export const recordDetailSchema = recordEntitySchema.and(
  z.object({
    values: z.array(
      z.object({
        fieldId: z.uuid(),
        value: z.unknown(),
      }),
    ),
  }),
);

export type RecordDetail = z.infer<typeof recordDetailSchema>;

export const createRecordInputSchema = z.object({
  formId: z.uuid(),
  /** Valores indexados por field_id; se serializan a JSON al guardar. */
  values: z.record(z.uuid(), z.unknown()).optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordInputSchema>;

export const updateValuesInputSchema = z.record(z.uuid(), z.unknown());

export type UpdateValuesInput = z.infer<typeof updateValuesInputSchema>;

export type RecordOrderBy = "created_at" | "updated_at";

export type RecordOrderDirection = "asc" | "desc";

export const listByFormOptionsSchema = z.object({
  orderBy: z.enum(["created_at", "updated_at"]).default("created_at"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  includeDisabled: z.boolean().default(false),
  includeDeleted: z.boolean().default(false),
});

export type ListByFormOptions = z.input<typeof listByFormOptionsSchema>;
