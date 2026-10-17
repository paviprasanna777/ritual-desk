import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { HttpError } from '../middleware/error.middleware';
import { createRemindersRepository, type ReminderInput } from '../repositories/reminders.repository';
import {
  reminderIdSchema,
  reminderListQuerySchema,
} from '../validators/reminders.validator';
import { sendSuccess } from '../utils/response';

export function createRemindersController(database: Database.Database) {
  const repository = createRemindersRepository(database);
  const list: RequestHandler = (request, response, next) => {
    try {
      const query = reminderListQuerySchema.parse(request.query);
      sendSuccess(response, repository.list(query.date));
    } catch (error) {
      next(error);
    }
  };
  const get: RequestHandler = (request, response, next) => {
    try {
      const reminder = repository.findById(reminderIdSchema.parse(request.params.id));
      if (!reminder) throw new HttpError(404, 'Reminder not found');
      sendSuccess(response, reminder);
    } catch (error) {
      next(error);
    }
  };
  const create: RequestHandler = (request, response, next) => {
    try {
      const input = request.body as ReminderInput;
      if (!repository.relatedRecordsExist(input)) {
        throw new HttpError(404, 'Linked booking or ritual not found');
      }
      sendSuccess(response, repository.create(input), 201);
    } catch (error) {
      next(error);
    }
  };
  const update: RequestHandler = (request, response, next) => {
    try {
      const id = reminderIdSchema.parse(request.params.id);
      const current = repository.findById(id);
      if (!current) throw new HttpError(404, 'Reminder not found');
      const changes = request.body as Partial<ReminderInput>;
      const input: ReminderInput = {
        title: changes.title ?? String(current.title),
        remindAt: changes.remindAt ?? String(current.remind_at),
        bookingId: changes.bookingId === undefined
          ? current.booking_id as number | null
          : changes.bookingId,
        ritualId: changes.ritualId === undefined
          ? current.ritual_id as number | null
          : changes.ritualId,
        done: changes.done ?? Boolean(current.done),
      };
      if (input.bookingId !== null && input.ritualId !== null) {
        throw new HttpError(400, 'A reminder may be linked to a booking or a ritual, not both');
      }
      if (!repository.relatedRecordsExist(input)) {
        throw new HttpError(404, 'Linked booking or ritual not found');
      }
      sendSuccess(response, repository.update(id, input));
    } catch (error) {
      next(error);
    }
  };
  const remove: RequestHandler = (request, response, next) => {
    try {
      if (!repository.delete(reminderIdSchema.parse(request.params.id))) {
        throw new HttpError(404, 'Reminder not found');
      }
      sendSuccess(response, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  return { list, get, create, update, remove };
}
