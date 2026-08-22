import { z } from "zod";

export const sectionSchema = z.object({
  id: z.uuid(),
  /** Sección padre; null = raíz. La jerarquía es opcional por nodo. */
  parentId: z.uuid().nullable(),
  name: z.string().min(1),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  position: z.number().int().nonnegative(),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export type Section = z.infer<typeof sectionSchema>;

const nullableText = z.string().min(1);
/** null explícito = pasar a raíz; undefined = no tocar. */
const parentIdInput = z.uuid().nullish();

export const createSectionInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: nullableText.max(2000).nullish(),
  icon: nullableText.max(100).nullish(),
  parentId: parentIdInput,
  position: z.number().int().nonnegative().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionInputSchema>;

export const updateSectionInputSchema = createSectionInputSchema.partial();

export type UpdateSectionInput = z.infer<typeof updateSectionInputSchema>;

export const reorderInputSchema = z.array(z.uuid()).min(1);

export type ReorderInput = z.infer<typeof reorderInputSchema>;
