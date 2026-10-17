import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createAuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { loginSchema } from '../validators/auth.validator';

export function createAuthRouter(database: Database.Database): Router {
  const router = Router();
  const controller = createAuthController(database);
  router.post('/login', validateBody(loginSchema), controller.login);
  router.get('/me', authMiddleware, controller.me);
  return router;
}
