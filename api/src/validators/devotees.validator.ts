import { z } from 'zod';

export const devoteeIdSchema = z.coerce.number().int().positive();

export const devoteeSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().nullable().default(null),
  address: z.string().trim().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const devoteeListQuerySchema = z.object({
  search: z.string().default(''),
});
