import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createBookingsController } from '../controllers/bookings.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  bookingCancelSchema,
  bookingCompleteSchema,
  bookingCreateSchema,
  bookingPaymentSchema,
  bookingUpdateSchema,
} from '../validators/bookings.validator';

export function createBookingsRouter(database: Database.Database): Router {
  const router = Router();
  const controller = createBookingsController(database);
  router.get('/', controller.list);
  router.post('/', validateBody(bookingCreateSchema), controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', validateBody(bookingUpdateSchema), controller.update);
  router.post('/:id/payments', validateBody(bookingPaymentSchema), controller.addPayment);
  router.post('/:id/complete', validateBody(bookingCompleteSchema), controller.complete);
  router.post('/:id/cancel', validateBody(bookingCancelSchema), controller.cancel);
  return router;
}
