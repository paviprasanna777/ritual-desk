import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Expected a valid calendar date');

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const common = {
  title: z.string().trim().min(1),
  time: timeSchema.nullable().default(null),
  notes: z.string().nullable().default(null),
  active: z.number().int().min(0).max(1).optional(),
};

export const ritualIdSchema = z.coerce.number().int().positive();
export const ritualDateSchema = dateSchema;

export const ritualSchema = z.discriminatedUnion('type', [
  z.object({
    ...common,
    type: z.literal('daily'),
    daysOfWeek: z.null().optional().default(null),
    dayOfMonth: z.null().optional().default(null),
    date: z.null().optional().default(null),
  }),
  z.object({
    ...common,
    type: z.literal('weekly'),
    daysOfWeek: z.string().regex(/^[0-6](,[0-6])*$/),
    dayOfMonth: z.null().optional().default(null),
    date: z.null().optional().default(null),
  }),
  z.object({
    ...common,
    type: z.literal('monthly'),
    daysOfWeek: z.null().optional().default(null),
    dayOfMonth: z.number().int().min(1).max(31),
    date: z.null().optional().default(null),
  }),
  z.object({
    ...common,
    type: z.literal('festival'),
    daysOfWeek: z.null().optional().default(null),
    dayOfMonth: z.null().optional().default(null),
    date: dateSchema,
  }),
  z.object({
    ...common,
    type: z.literal('special'),
    daysOfWeek: z.null().optional().default(null),
    dayOfMonth: z.null().optional().default(null),
    date: dateSchema,
  }),
]);

export const ritualLogSchema = z.object({ date: dateSchema });
