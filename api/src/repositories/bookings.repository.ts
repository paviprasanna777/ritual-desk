import type Database from 'better-sqlite3';

export interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
  devoteeId?: number;
  balanceDue?: boolean;
}

export interface BookingInput {
  homamTypeId: number;
  devoteeId: number;
  scheduledAt: string | null;
  location: string | null;
  totalAmount: number;
  status: 'booked' | 'scheduled';
  notes: string | null;
}

export interface PaymentInput {
  amount: number;
  kind: 'advance' | 'part' | 'final' | 'refund';
  mode: 'cash' | 'upi' | 'other';
  paidOn: string;
  note: string | null;
}

export function createBookingsRepository(database: Database.Database) {
  return {
    transaction<T>(operation: () => T): T {
      return database.transaction(operation)();
    },

    list(filters: BookingFilters): unknown[] {
      const clauses: string[] = [];
      const values: Array<string | number> = [];
      if (filters.status !== undefined) {
        clauses.push('status = ?');
        values.push(filters.status);
      }
      if (filters.from !== undefined) {
        clauses.push('scheduled_at >= ?');
        values.push(filters.from);
      }
      if (filters.to !== undefined) {
        clauses.push('scheduled_at <= ?');
        values.push(filters.to);
      }
      if (filters.devoteeId !== undefined) {
        clauses.push('devotee_id = ?');
        values.push(filters.devoteeId);
      }
      if (filters.balanceDue) {
        clauses.push("status != 'cancelled' AND balance > 0");
      }

      return database.prepare(`
        SELECT *
        FROM booking_summary
        ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
        ORDER BY scheduled_at ASC, id ASC
      `).all(...values);
    },

    findById(id: number): Record<string, unknown> | undefined {
      return database.prepare(
        'SELECT * FROM booking_summary WHERE id = ?',
      ).get(id) as Record<string, unknown> | undefined;
    },

    payments(bookingId: number): unknown[] {
      return database.prepare(`
        SELECT id, booking_id, amount, kind, mode, paid_on, note
        FROM payments
        WHERE booking_id = ?
        ORDER BY id ASC
      `).all(bookingId);
    },

    homamDefaultAmount(id: number): number | undefined {
      const row = database.prepare(
        'SELECT default_amount FROM homam_types WHERE id = ?',
      ).get(id) as { default_amount: number } | undefined;
      return row?.default_amount;
    },

    devoteeExists(id: number): boolean {
      return Boolean(database.prepare('SELECT 1 FROM devotees WHERE id = ?').get(id));
    },

    hasClash(scheduledAt: string, exceptId?: number): boolean {
      return Boolean(database.prepare(`
        SELECT 1
        FROM bookings
        WHERE scheduled_at = ?
          AND status != 'cancelled'
          AND (? IS NULL OR id != ?)
        LIMIT 1
      `).get(scheduledAt, exceptId ?? null, exceptId ?? null));
    },

    insertBooking(input: BookingInput): number {
      const result = database.prepare(`
        INSERT INTO bookings (
          homam_type_id, devotee_id, scheduled_at, location, total_amount, status, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.homamTypeId,
        input.devoteeId,
        input.scheduledAt,
        input.location,
        input.totalAmount,
        input.status,
        input.notes,
      );
      return Number(result.lastInsertRowid);
    },

    updateBooking(
      id: number,
      input: Omit<BookingInput, 'status'> & { status: string },
    ): void {
      database.prepare(`
        UPDATE bookings
        SET homam_type_id = ?, devotee_id = ?, scheduled_at = ?, location = ?,
            total_amount = ?, status = ?, notes = ?
        WHERE id = ?
      `).run(
        input.homamTypeId,
        input.devoteeId,
        input.scheduledAt,
        input.location,
        input.totalAmount,
        input.status,
        input.notes,
        id,
      );
    },

    insertPayment(bookingId: number, payment: PaymentInput): void {
      database.prepare(`
        INSERT INTO payments (booking_id, amount, kind, mode, paid_on, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        bookingId,
        payment.amount,
        payment.kind,
        payment.mode,
        payment.paidOn,
        payment.note,
      );
    },

    setCompleted(id: number, completedAt: string): void {
      database.prepare(`
        UPDATE bookings SET status = 'completed', completed_at = ? WHERE id = ?
      `).run(completedAt, id);
    },

    setCancelled(id: number, cancelledAt: string): void {
      database.prepare(`
        UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?
      `).run(cancelledAt, id);
    },
  };
}
