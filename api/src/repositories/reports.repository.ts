import type Database from 'better-sqlite3';

export function createReportsRepository(database: Database.Database) {
  return {
    payments(from: string, to: string) {
      const bookingRows = database.prepare(`
        SELECT id, total_amount, paid_amount, balance, status
        FROM booking_summary
        WHERE scheduled_at >= ? AND scheduled_at < ?
        ORDER BY scheduled_at, id
      `).all(from, to) as Array<{
        id: number;
        total_amount: number;
        paid_amount: number;
        balance: number;
        status: string;
      }>;
      const bookingIds = bookingRows.map((booking) => booking.id);
      let payments: Array<Record<string, unknown>> = [];
      let breakdown: Array<{ mode: string; amount: number }> = [];

      if (bookingIds.length > 0) {
        const placeholders = bookingIds.map(() => '?').join(', ');
        payments = database.prepare(`
          SELECT payments.id, payments.booking_id, payments.amount, payments.kind,
                 payments.mode, payments.paid_on, payments.note,
                 devotees.name AS devotee_name, homam_types.name AS homam_name
          FROM payments
          JOIN bookings ON bookings.id = payments.booking_id
          JOIN devotees ON devotees.id = bookings.devotee_id
          JOIN homam_types ON homam_types.id = bookings.homam_type_id
          WHERE payments.booking_id IN (${placeholders})
          ORDER BY payments.paid_on DESC, payments.id DESC
        `).all(...bookingIds) as Array<Record<string, unknown>>;
        breakdown = database.prepare(`
          SELECT payments.mode,
                 SUM(CASE WHEN payments.kind = 'refund'
                   THEN -payments.amount ELSE payments.amount END) AS amount
          FROM payments
          WHERE payments.booking_id IN (${placeholders})
          GROUP BY payments.mode
        `).all(...bookingIds) as Array<{ mode: string; amount: number }>;
      }

      const byMode = { cash: 0, upi: 0, other: 0 };
      for (const row of breakdown) {
        if (row.mode === 'cash' || row.mode === 'upi' || row.mode === 'other') {
          byMode[row.mode] = row.amount;
        }
      }

      return {
        totalCharged: bookingRows.reduce(
          (sum, booking) => sum + booking.total_amount,
          0,
        ),
        totalCollected: bookingRows.reduce(
          (sum, booking) => sum + booking.paid_amount,
          0,
        ),
        totalDue: bookingRows.reduce(
          (sum, booking) => sum + (
            booking.status !== 'cancelled' && booking.balance > 0
              ? booking.balance
              : 0
          ),
          0,
        ),
        breakdown: byMode,
        payments,
      };
    },
  };
}
