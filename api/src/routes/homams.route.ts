import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createHomamsController } from '../controllers/homams.controller';
import { validateBody } from '../middleware/validation.middleware';
import { homamSchema } from '../validators/homams.validator';

export function createHomamsRouter(database: Database.Database): Router {
  const router = Router();
  const controller = createHomamsController(database);
  router.get('/', controller.list);
  router.post('/', validateBody(homamSchema), controller.create);
  router.put('/:id', validateBody(homamSchema), controller.update);
  router.delete('/:id', controller.remove);
  return router;
}
