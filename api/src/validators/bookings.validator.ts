import { z } from 'zod';

const positiveId = z.number().int().positive();
const dateText = z.string().trim().min(1);
const paymentMode = z.enum(['cash', 'upi', 'other']);
const paymentKind = z.enum(['advance', 'part', 'final', 'refund']);

export const bookingIdSchema = z.coerce.number().int().positive();

export const bookingListQuerySchema = z.object({
  status: z.enum(['booked', 'scheduled', 'completed', 'cancelled']).optional(),
  from: dateText.optional(),
  to: dateText.optional(),
  devoteeId: z.coerce.number().int().positive().optional(),
  balanceDue: z.enum(['true', 'false']).optional(),
});

export const bookingCreateSchema = z.object({
  homamTypeId: positiveId,
  devoteeId: positiveId,
  scheduledAt: dateText.nullable().optional(),
  location: z.string().nullable().optional(),
  totalAmount: z.number().int().nonnegative().optional(),
  advanceAmount: z.number().int().nonnegative().optional(),
  advanceMode: paymentMode.optional(),
  notes: z.string().nullable().optional(),
}).superRefine((input, context) => {
  if ((input.advanceAmount ?? 0) > 0 && input.advanceMode === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['advanceMode'],
      message: 'advanceMode is required when advanceAmount is greater than zero',
    });
  }
});

export const bookingUpdateSchema = z.object({
  homamTypeId: positiveId.optional(),
  devoteeId: positiveId.optional(),
  scheduledAt: dateText.nullable().optional(),
  location: z.string().nullable().optional(),
  totalAmount: z.number().int().nonnegative().optional(),
  notes: z.string().nullable().optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: 'At least one field must be provided',
});

export const bookingPaymentSchema = z.object({
  amount: z.number().int().positive(),
  kind: paymentKind,
  mode: paymentMode,
  paidOn: dateText,
  note: z.string().nullable().optional(),
});

export const bookingCompleteSchema = z.object({
  mode: paymentMode,
  paidOn: dateText,
  amount: z.number().int().positive().optional(),
});

export const bookingCancelSchema = z.object({
  refundAmount: z.number().int().nonnegative().optional(),
  note: z.string().nullable().optional(),
});

export const forceQuerySchema = z.object({
  force: z.enum(['true', 'false']).optional(),
});
