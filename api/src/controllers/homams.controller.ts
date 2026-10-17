import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createHomamsRepository } from '../repositories/homams.repository';
import { createHomamsService } from '../services/homams.service';
import { homamIdSchema, homamListQuerySchema } from '../validators/homams.validator';
import { sendSuccess } from '../utils/response';

export function createHomamsController(database: Database.Database) {
  const service = createHomamsService(createHomamsRepository(database));

  const list: RequestHandler = (request, response, next) => {
    try {
      const query = homamListQuerySchema.parse(request.query);
      sendSuccess(response, service.list(query.all === 'true'));
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
      const id = homamIdSchema.parse(request.params.id);
      sendSuccess(response, service.update(id, request.body));
    } catch (error) {
      next(error);
    }
  };

  const remove: RequestHandler = (request, response, next) => {
    try {
      service.delete(homamIdSchema.parse(request.params.id));
      sendSuccess(response, { deleted: true });
    } catch (error) {
      next(error);
    }
  };

  return { list, create, update, remove };
}
