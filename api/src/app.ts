import cors from 'cors';
import express, { type Express } from 'express';
import type Database from 'better-sqlite3';
import { createAuthRouter } from './routes/auth.route';
import { createHealthRouter } from './config/health.route';
import { createDevoteesRouter } from './routes/devotees.route';
import { createHomamsRouter } from './routes/homams.route';
import { createBookingsRouter } from './routes/bookings.route';
import { createRitualsRouter } from './routes/rituals.route';
import { createScheduleRouter } from './routes/schedule.route';
import { createRemindersRouter } from './routes/reminders.route';
import { createDashboardRouter } from './routes/dashboard.route';
import { createHistoryRouter } from './routes/history.route';
import { createReportsRouter } from './routes/reports.route';
import { createBackupRouter } from './routes/backup.route';
import { authMiddleware } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';

export function createApp(database: Database.Database): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(createHealthRouter(database));
  app.use('/auth', createAuthRouter(database));
  app.use(authMiddleware);
  app.use('/homams', createHomamsRouter(database));
  app.use('/devotees', createDevoteesRouter(database));
  app.use('/bookings', createBookingsRouter(database));
  app.use('/rituals', createRitualsRouter(database));
  app.use('/schedule', createScheduleRouter(database));
  app.use('/reminders', createRemindersRouter(database));
  app.use('/dashboard', createDashboardRouter(database));
  app.use('/history', createHistoryRouter(database));
  app.use('/reports', createReportsRouter(database));
  app.use('/backup', createBackupRouter(database));
  app.use(errorMiddleware);

  return app;
}
