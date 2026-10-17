import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createHistoryController } from '../controllers/history.controller';

export function createHistoryRouter(database: Database.Database): Router {
  const router = Router();
  router.get('/', createHistoryController(database).list);
  return router;
}
