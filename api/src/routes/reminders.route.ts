import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createRemindersController } from '../controllers/reminders.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  reminderCreateSchema,
  reminderUpdateSchema,
} from '../validators/reminders.validator';

export function createRemindersRouter(database: Database.Database): Router {
  const router = Router();
  const controller = createRemindersController(database);
  router.get('/', controller.list);
  router.post('/', validateBody(reminderCreateSchema), controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', validateBody(reminderUpdateSchema), controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
