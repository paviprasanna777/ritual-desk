import { Router } from 'express';
import type Database from 'better-sqlite3';
import { sendSuccess } from '../utils/response';

export function createHealthRouter(database: Database.Database): Router {
  const router = Router();

  router.get('/health', (_request, response) => {
    database.prepare('SELECT 1').get();
    sendSuccess(response, { status: 'ok' });
  });

  return router;
}
