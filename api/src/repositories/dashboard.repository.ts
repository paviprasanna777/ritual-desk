import type Database from 'better-sqlite3';

export function createDashboardRepository(database: Database.Database) {
  return {
    todayTotals(start: string, end: string): {
      todayCount: number;
      doneBookings: number;
    } {
      const row = database.prepare(`
        SELECT
          COUNT(*) AS today_count,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0)
            AS done_bookings
        FROM bookings
        WHERE scheduled_at >= ? AND scheduled_at < ? AND status != 'cancelled'
      `).get(start, end) as { today_count: number; done_bookings: number };
      return { todayCount: row.today_count, doneBookings: row.done_bookings };
    },

    balanceToCollect(): number {
      const row = database.prepare(`
        SELECT COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0)
          AS total
        FROM booking_summary
        WHERE status != 'cancelled'
      `).get() as { total: number };
      return row.total;
    },

    next7DaysCount(start: string, end: string): number {
      const row = database.prepare(`
        SELECT COUNT(*) AS total
        FROM bookings
        WHERE scheduled_at >= ? AND scheduled_at < ? AND status != 'cancelled'
      `).get(start, end) as { total: number };
      return row.total;
    },

    upcoming(start: string, limit: number): unknown[] {
      return database.prepare(`
        SELECT * FROM booking_summary
        WHERE scheduled_at >= ? AND status NOT IN ('cancelled', 'completed')
        ORDER BY scheduled_at ASC, id ASC
        LIMIT ?
      `).all(start, limit);
    },

    balanceDue(limit: number): unknown[] {
      return database.prepare(`
        SELECT * FROM booking_summary
        WHERE status != 'cancelled' AND balance > 0
        ORDER BY balance DESC, scheduled_at ASC, id ASC
        LIMIT ?
      `).all(limit);
    },

    todaysReminders(start: string, end: string): unknown[] {
      return database.prepare(`
        SELECT id, title, remind_at, booking_id, ritual_id, done
        FROM reminders
        WHERE remind_at >= ? AND remind_at < ?
        ORDER BY remind_at ASC, id ASC
      `).all(start, end);
    },
  };
}
