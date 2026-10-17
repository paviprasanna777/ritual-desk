import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Expected a valid calendar date');

export const scheduleRangeSchema = z.object({
  from: dateSchema,
  to: dateSchema,
}).refine(({ from, to }) => from <= to, {
  message: 'to must be on or after from',
  path: ['to'],
}).refine(({ from, to }) => {
  const start = new Date(`${from}T00:00:00.000Z`).valueOf();
  const end = new Date(`${to}T00:00:00.000Z`).valueOf();
  return (end - start) / 86_400_000 + 1 <= 62;
}, {
  message: 'Schedule range cannot exceed 62 days',
  path: ['to'],
});
