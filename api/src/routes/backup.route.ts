import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createBackupController } from '../controllers/backup.controller';

export function createBackupRouter(database: Database.Database): Router {
  const router = Router();
  router.get('/', createBackupController(database).download);
  return router;
}
