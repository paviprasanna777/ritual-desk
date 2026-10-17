import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createDashboardController } from '../controllers/dashboard.controller';

export function createDashboardRouter(database: Database.Database): Router {
  const router = Router();
  router.get('/summary', createDashboardController(database).summary);
  return router;
}
