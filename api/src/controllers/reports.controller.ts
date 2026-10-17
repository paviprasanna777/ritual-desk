import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createReportsRepository } from '../repositories/reports.repository';
import { monthSchema } from '../validators/reports.validator';
import { sendSuccess } from '../utils/response';

function monthBounds(month: string): [string, string] {
  const [year, monthNumber] = month.split('-').map(Number);
  return [
    `${month}-01T00:00:00`,
    `${new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)}T00:00:00`,
  ];
}

export function createReportsController(database: Database.Database) {
  const repository = createReportsRepository(database);
  const payments: RequestHandler = (request, response, next) => {
    try {
      const month = monthSchema.parse(request.query.month);
      const [from, to] = monthBounds(month);
      sendSuccess(response, repository.payments(from, to));
    } catch (error) {
      next(error);
    }
  };
  return { payments };
}
