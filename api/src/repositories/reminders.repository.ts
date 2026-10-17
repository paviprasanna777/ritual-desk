import type Database from 'better-sqlite3';

export interface ReminderInput {
  title: string;
  remindAt: string;
  bookingId: number | null;
  ritualId: number | null;
  done: boolean;
}

export function createRemindersRepository(database: Database.Database) {
  return {
    list(date?: string): unknown[] {
      if (!date) {
        return database.prepare(`
          SELECT id, title, remind_at, booking_id, ritual_id, done, auto_created
          FROM reminders
          ORDER BY remind_at, id
        `).all();
      }
      const nextDate = new Date(`${date}T00:00:00.000Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      return database.prepare(`
        SELECT id, title, remind_at, booking_id, ritual_id, done, auto_created
        FROM reminders
        WHERE remind_at >= ? AND remind_at < ?
        ORDER BY remind_at, id
      `).all(`${date}T00:00:00`, `${nextDate.toISOString().slice(0, 10)}T00:00:00`);
    },

    findById(id: number): Record<string, unknown> | undefined {
      return database.prepare(`
        SELECT id, title, remind_at, booking_id, ritual_id, done, auto_created
        FROM reminders
        WHERE id = ?
      `).get(id) as Record<string, unknown> | undefined;
    },

    relatedRecordsExist(input: Pick<ReminderInput, 'bookingId' | 'ritualId'>): boolean {
      if (input.bookingId !== null && !database.prepare(
        'SELECT 1 FROM bookings WHERE id = ?',
      ).get(input.bookingId)) return false;
      if (input.ritualId !== null && !database.prepare(
        'SELECT 1 FROM rituals WHERE id = ?',
      ).get(input.ritualId)) return false;
      return true;
    },

    create(input: ReminderInput): Record<string, unknown> {
      const result = database.prepare(`
        INSERT INTO reminders (title, remind_at, booking_id, ritual_id, done)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        input.title,
        input.remindAt,
        input.bookingId,
        input.ritualId,
        input.done ? 1 : 0,
      );
      return this.findById(Number(result.lastInsertRowid))!;
    },

    update(id: number, input: ReminderInput): Record<string, unknown> | undefined {
      const result = database.prepare(`
        UPDATE reminders
        SET title = ?, remind_at = ?, booking_id = ?, ritual_id = ?, done = ?
        WHERE id = ?
      `).run(
        input.title,
        input.remindAt,
        input.bookingId,
        input.ritualId,
        input.done ? 1 : 0,
        id,
      );
      return result.changes ? this.findById(id) : undefined;
    },

    delete(id: number): boolean {
      return database.prepare('DELETE FROM reminders WHERE id = ?').run(id).changes > 0;
    },

    replaceAutoForBooking(bookingId: number, scheduledAt: string | null): void {
      database.prepare(
        'DELETE FROM reminders WHERE booking_id = ? AND auto_created = 1',
      ).run(bookingId);
      if (!scheduledAt) return;

      const date = scheduledAt.slice(0, 10);
      const dayBefore = new Date(`${date}T00:00:00.000Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
        || Number.isNaN(dayBefore.valueOf())
        || dayBefore.toISOString().slice(0, 10) !== date
      ) {
        throw new Error('Cannot create booking reminders for an invalid scheduled date');
      }
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const insert = database.prepare(`
        INSERT INTO reminders (title, remind_at, booking_id, auto_created)
        VALUES (?, ?, ?, 1)
      `);
      insert.run(
        'Booking reminder (day before)',
        `${dayBefore.toISOString().slice(0, 10)}T18:00:00`,
        bookingId,
      );
      insert.run('Booking reminder (same day)', `${date}T06:00:00`, bookingId);
    },

    removeAutoForBooking(bookingId: number): void {
      database.prepare(
        'DELETE FROM reminders WHERE booking_id = ? AND auto_created = 1',
      ).run(bookingId);
    },
  };
}
