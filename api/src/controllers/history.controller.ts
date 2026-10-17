import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createHistoryRepository } from '../repositories/history.repository';
import { monthSchema } from '../validators/reports.validator';
import { sendSuccess } from '../utils/response';

function monthBounds(month: string): [string, string] {
  const [year, monthNumber] = month.split('-').map(Number);
  return [
    `${month}-01T00:00:00`,
    `${new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)}T00:00:00`,
  ];
}

export function createHistoryController(database: Database.Database) {
  const repository = createHistoryRepository(database);
  const list: RequestHandler = (request, response, next) => {
    try {
      const month = monthSchema.parse(request.query.month);
      const [from, to] = monthBounds(month);
      sendSuccess(response, repository.forMonth(from, to));
    } catch (error) {
      next(error);
    }
  };
  return { list };
}
