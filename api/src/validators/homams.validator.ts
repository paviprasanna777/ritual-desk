import { z } from 'zod';

export const homamIdSchema = z.coerce.number().int().positive();

export const homamSchema = z.object({
  name: z.string().trim().min(1),
  default_amount: z.number().int().nonnegative(),
  duration_mins: z.number().int().positive().nullable().default(null),
  items_needed: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().nullable().default(null),
});

export const homamListQuerySchema = z.object({
  all: z.union([z.literal('true'), z.literal('false')]).optional(),
});
