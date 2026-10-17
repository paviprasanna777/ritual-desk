import { z } from 'zod';

const reminderId = z.coerce.number().int().positive();
const reminderInput = {
  title: z.string().trim().min(1),
  remindAt: z.string().trim().min(1),
  bookingId: z.number().int().positive().nullable().default(null),
  ritualId: z.number().int().positive().nullable().default(null),
  done: z.boolean().default(false),
};

export const reminderIdSchema = reminderId;
export const reminderDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Expected a valid calendar date');

export const reminderCreateSchema = z.object(reminderInput)
  .refine((value) => value.bookingId === null || value.ritualId === null, {
    message: 'A reminder may be linked to a booking or a ritual, not both',
  });

export const reminderUpdateSchema = z.object({
  title: reminderInput.title.optional(),
  remindAt: reminderInput.remindAt.optional(),
  bookingId: reminderInput.bookingId.optional(),
  ritualId: reminderInput.ritualId.optional(),
  done: reminderInput.done.optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

export const reminderListQuerySchema = z.object({ date: reminderDateSchema.optional() });
