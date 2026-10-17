import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createDevoteesController } from '../controllers/devotees.controller';
import { validateBody } from '../middleware/validation.middleware';
import { devoteeSchema } from '../validators/devotees.validator';

export function createDevoteesRouter(database: Database.Database): Router {
  const router = Router();
  const controller = createDevoteesController(database);
  router.get('/', controller.list);
  router.post('/', validateBody(devoteeSchema), controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', validateBody(devoteeSchema), controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
