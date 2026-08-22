import { z } from "zod";

/**
 * Lista inicial de tipos de campo soportados. El esquema de la base de datos
 * guarda `fields.type` como TEXT sin CHECK rígido para permitir tipos nuevos
 * sin migración; esta constante es la fuente de verdad a nivel de aplicación.
 */
export const FIELD_TYPES = [
  "text",
  "long_text",
  "number",
  "boolean",
  "date",
  "datetime",
  "url",
  "email",
  "password",
  "select",
  "multiselect",
  "tags",
  "file_path",
  "image",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const fieldTypeSchema = z.enum(FIELD_TYPES);

export const fieldSchema = z.object({
  id: z.uuid(),
  formId: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  // TEXT flexible en DB; se lee como string para tolerar tipos futuros.
  type: z.string().min(1),
  required: z.boolean(),
  searchable: z.boolean(),
  position: z.number().int().nonnegative(),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export type Field = z.infer<typeof fieldSchema>;

const nullableText = z.string().min(1);

export const createFieldInputSchema = z.object({
  formId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: nullableText.max(2000).nullish(),
  type: fieldTypeSchema,
  required: z.boolean().optional(),
  searchable: z.boolean().optional(),
  position: z.number().int().nonnegative().optional(),
});

export type CreateFieldInput = z.infer<typeof createFieldInputSchema>;

export const updateFieldInputSchema = createFieldInputSchema
  .omit({ formId: true })
  .partial();

export type UpdateFieldInput = z.infer<typeof updateFieldInputSchema>;

export const reorderInputSchema = z.array(z.uuid()).min(1);

export type ReorderInput = z.infer<typeof reorderInputSchema>;
