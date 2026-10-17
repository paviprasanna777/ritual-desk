import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createReportsController } from '../controllers/reports.controller';

export function createReportsRouter(database: Database.Database): Router {
  const router = Router();
  router.get('/payments', createReportsController(database).payments);
  return router;
}
