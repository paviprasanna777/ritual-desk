import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { HttpError } from '../middleware/error.middleware';
import { createRitualsRepository } from '../repositories/rituals.repository';
import { ritualDateSchema, ritualIdSchema } from '../validators/rituals.validator';
import { sendSuccess } from '../utils/response';

export function createRitualsController(database: Database.Database) {
  const repository = createRitualsRepository(database);

  const list: RequestHandler = (_request, response) => {
    sendSuccess(response, repository.list());
  };
  const create: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(response, repository.create(request.body), 201);
    } catch (error) {
      next(error);
    }
  };
  const get: RequestHandler = (request, response, next) => {
    try {
      const ritual = repository.findById(ritualIdSchema.parse(request.params.id));
      if (!ritual) throw new HttpError(404, 'Ritual not found');
      sendSuccess(response, ritual);
    } catch (error) {
      next(error);
    }
  };
  const update: RequestHandler = (request, response, next) => {
    try {
      const ritual = repository.update(
        ritualIdSchema.parse(request.params.id),
        request.body,
      );
      if (!ritual) throw new HttpError(404, 'Ritual not found');
      sendSuccess(response, ritual);
    } catch (error) {
      next(error);
    }
  };
  const remove: RequestHandler = (request, response, next) => {
    try {
      if (!repository.delete(ritualIdSchema.parse(request.params.id))) {
        throw new HttpError(404, 'Ritual not found');
      }
      sendSuccess(response, { deleted: true });
    } catch (error) {
      next(error);
    }
  };
  const log: RequestHandler = (request, response, next) => {
    try {
      const id = ritualIdSchema.parse(request.params.id);
      const date = ritualDateSchema.parse(request.body.date);
      if (!repository.findById(id)) throw new HttpError(404, 'Ritual not found');
      repository.log(id, date);
      sendSuccess(response, { ritualId: id, date, done: true });
    } catch (error) {
      next(error);
    }
  };
  const removeLog: RequestHandler = (request, response, next) => {
    try {
      const id = ritualIdSchema.parse(request.params.id);
      const date = ritualDateSchema.parse(request.params.date);
      if (!repository.findById(id)) throw new HttpError(404, 'Ritual not found');
      repository.removeLog(id, date);
      sendSuccess(response, { ritualId: id, date, done: false });
    } catch (error) {
      next(error);
    }
  };

  return { list, create, get, update, remove, log, removeLog };
}
