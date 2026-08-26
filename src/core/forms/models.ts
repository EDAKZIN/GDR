import { z } from "zod";

export const formSchema = z.object({
  id: z.uuid(),
  sectionId: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  position: z.number().int().nonnegative(),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export type Form = z.infer<typeof formSchema>;

const nullableText = z.string().min(1);

export const createFormInputSchema = z.object({
  sectionId: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: nullableText.max(2000).nullish(),
  icon: nullableText.max(100).nullish(),
  position: z.number().int().nonnegative().optional(),
});

export type CreateFormInput = z.infer<typeof createFormInputSchema>;

export const updateFormInputSchema = createFormInputSchema
  .omit({ sectionId: true })
  .partial();

export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;

export const reorderInputSchema = z.array(z.uuid()).min(1);

export type ReorderInput = z.infer<typeof reorderInputSchema>;
