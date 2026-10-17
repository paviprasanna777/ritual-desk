import type Database from 'better-sqlite3';
import type { ScheduledRitual } from '../services/ritual-occurrences';

export function createScheduleRepository(database: Database.Database) {
  return {
    bookings(from: string, toExclusive: string): Array<Record<string, unknown>> {
      return database.prepare(`
        SELECT id, homam_name, scheduled_at, status
        FROM booking_summary
        WHERE scheduled_at >= ? AND scheduled_at < ? AND status != 'cancelled'
      `).all(from, toExclusive) as Array<Record<string, unknown>>;
    },

    rituals(): ScheduledRitual[] {
      return database.prepare(`
        SELECT id, title, type, time, days_of_week, day_of_month, date
        FROM rituals
        WHERE active = 1
      `).all() as ScheduledRitual[];
    },

    ritualLogs(from: string, to: string): Array<{ ritual_id: number; date: string }> {
      return database.prepare(`
        SELECT ritual_id, date
        FROM ritual_log
        WHERE date >= ? AND date <= ?
      `).all(from, to) as Array<{ ritual_id: number; date: string }>;
    },
  };
}
