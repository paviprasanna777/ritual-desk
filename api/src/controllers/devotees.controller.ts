import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createDevoteesRepository } from '../repositories/devotees.repository';
import { createDevoteesService } from '../services/devotees.service';
import { devoteeIdSchema, devoteeListQuerySchema } from '../validators/devotees.validator';
import { sendSuccess } from '../utils/response';

export function createDevoteesController(database: Database.Database) {
  const service = createDevoteesService(createDevoteesRepository(database));

  const list: RequestHandler = (request, response, next) => {
    try {
      const query = devoteeListQuerySchema.parse(request.query);
      sendSuccess(response, service.list(query.search));
    } catch (error) {
      next(error);
    }
  };

  const get: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(response, service.get(devoteeIdSchema.parse(request.params.id)));
    } catch (error) {
      next(error);
    }
  };

  const create: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(response, service.create(request.body), 201);
    } catch (error) {
      next(error);
    }
  };

  const update: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(
        response,
        service.update(devoteeIdSchema.parse(request.params.id), request.body),
      );
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = (request, response, next) => {
    try {
      service.delete(devoteeIdSchema.parse(request.params.id));
      sendSuccess(response, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  return { list, get, create, update, remove };
}
