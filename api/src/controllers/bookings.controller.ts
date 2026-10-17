import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createBookingsRepository } from '../repositories/bookings.repository';
import { createRemindersRepository } from '../repositories/reminders.repository';
import { createBookingsService } from '../services/bookings.service';
import {
  bookingIdSchema,
  bookingListQuerySchema,
  forceQuerySchema,
} from '../validators/bookings.validator';
import { sendSuccess } from '../utils/response';

function dateBoundary(value: string | undefined, endOfDay: boolean): string | undefined {
  if (value === undefined || value.includes('T')) return value;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`;
}

export function createBookingsController(database: Database.Database) {
  const service = createBookingsService(
    createBookingsRepository(database),
    createRemindersRepository(database),
  );

  const list: RequestHandler = (request, response, next) => {
    try {
      const query = bookingListQuerySchema.parse(request.query);
      sendSuccess(response, service.list({
        ...query,
        from: dateBoundary(query.from, false),
        to: dateBoundary(query.to, true),
        devoteeId: query.devoteeId,
        balanceDue: query.balanceDue === 'true',
      }));
    } catch (error) {
      next(error);
    }
  };

  const get: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(response, service.get(bookingIdSchema.parse(request.params.id)));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = (request, response, next) => {
    try {
      const query = forceQuerySchema.parse(request.query);
      sendSuccess(response, service.create(request.body, query.force === 'true'), 201);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(
        response,
        service.update(bookingIdSchema.parse(request.params.id), request.body),
      );
    } catch (error) {
      next(error);
    }
  };

  const addPayment: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(
        response,
        service.addPayment(bookingIdSchema.parse(request.params.id), request.body),
        201,
      );
    } catch (error) {
      next(error);
    }
  };

  const complete: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(
        response,
        service.complete(bookingIdSchema.parse(request.params.id), request.body),
      );
    } catch (error) {
      next(error);
    }
  };

  const cancel: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(
        response,
        service.cancel(bookingIdSchema.parse(request.params.id), request.body),
      );
    } catch (error) {
      next(error);
    }
  };

  return { list, get, create, update, addPayment, complete, cancel };
}
