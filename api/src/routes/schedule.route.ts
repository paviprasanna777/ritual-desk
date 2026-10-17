import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createScheduleController } from '../controllers/schedule.controller';

export function createScheduleRouter(database: Database.Database): Router {
  const router = Router();
  router.get('/', createScheduleController(database).list);
  return router;
}
