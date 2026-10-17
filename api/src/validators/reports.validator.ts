import { z } from 'zod';

export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/).refine((value) => {
  const [year, month] = value.split('-').map(Number);
  return year >= 1 && month >= 1 && month <= 12;
}, 'Expected a valid month in YYYY-MM format');
