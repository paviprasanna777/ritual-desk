import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createRitualsController } from '../controllers/rituals.controller';
import { validateBody } from '../middleware/validation.middleware';
import { ritualLogSchema, ritualSchema } from '../validators/rituals.validator';

export function createRitualsRouter(database: Database.Database): Router {
  const router = Router();
  const controller = createRitualsController(database);
  router.get('/', controller.list);
  router.post('/', validateBody(ritualSchema), controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', validateBody(ritualSchema), controller.update);
  router.delete('/:id', controller.remove);
  router.post('/:id/log', validateBody(ritualLogSchema), controller.log);
  router.delete('/:id/log/:date', controller.removeLog);
  return router;
}
