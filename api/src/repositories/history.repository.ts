import type Database from 'better-sqlite3';

export function createHistoryRepository(database: Database.Database) {
  return {
    forMonth(from: string, to: string) {
      const items = database.prepare(`
        SELECT *
        FROM booking_summary
        WHERE status IN ('completed', 'cancelled')
          AND COALESCE(completed_at, cancelled_at) >= ?
          AND COALESCE(completed_at, cancelled_at) < ?
        ORDER BY COALESCE(completed_at, cancelled_at) DESC, id DESC
      `).all(from, to);
      const totals = database.prepare(`
        SELECT
          COALESCE(SUM(total_amount), 0) AS totalCharged,
          COALESCE(SUM(paid_amount), 0) AS totalCollected,
          COALESCE(SUM(CASE
            WHEN status != 'cancelled' AND balance > 0 THEN balance ELSE 0
          END), 0) AS totalDue
        FROM booking_summary
        WHERE status IN ('completed', 'cancelled')
          AND COALESCE(completed_at, cancelled_at) >= ?
          AND COALESCE(completed_at, cancelled_at) < ?
      `).get(from, to);
      return { items, totals };
    },
  };
}
