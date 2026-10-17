import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createScheduleRepository } from '../repositories/schedule.repository';
import { createScheduleService } from '../services/schedule.service';
import { scheduleRangeSchema } from '../validators/schedule.validator';
import { sendSuccess } from '../utils/response';

export function createScheduleController(database: Database.Database) {
  const service = createScheduleService(createScheduleRepository(database));
  const list: RequestHandler = (request, response, next) => {
    try {
      const { from, to } = scheduleRangeSchema.parse(request.query);
      sendSuccess(response, service.list(from, to));
    } catch (error) {
      next(error);
    }
  };
  return { list };
}
