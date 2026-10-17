import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createDashboardRepository } from '../repositories/dashboard.repository';
import { createScheduleRepository } from '../repositories/schedule.repository';
import { createDashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export function createDashboardController(database: Database.Database) {
  const service = createDashboardService(
    createDashboardRepository(database),
    createScheduleRepository(database),
  );
  const summary: RequestHandler = (_request, response, next) => {
    try {
      sendSuccess(response, service.summary());
    } catch (error) {
      next(error);
    }
  };
  return { summary };
}
