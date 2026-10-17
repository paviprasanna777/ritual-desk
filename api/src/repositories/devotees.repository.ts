import type Database from 'better-sqlite3';

export interface DevoteeInput {
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface Devotee extends DevoteeInput {
  id: number;
  created_at: string;
}

export function createDevoteesRepository(database: Database.Database) {
  return {
    list(search: string): Devotee[] {
      return database.prepare(`
        SELECT id, name, phone, address, notes, created_at
        FROM devotees
        WHERE name LIKE ? COLLATE NOCASE OR phone LIKE ? COLLATE NOCASE
        ORDER BY name COLLATE NOCASE, id
      `).all(`%${search}%`, `%${search}%`) as Devotee[];
    },

    findById(id: number): Devotee | undefined {
      return database.prepare(`
        SELECT id, name, phone, address, notes, created_at
        FROM devotees
        WHERE id = ?
      `).get(id) as Devotee | undefined;
    },

    bookings(id: number): unknown[] {
      return database.prepare(`
        SELECT *
        FROM booking_summary
        WHERE devotee_id = ?
        ORDER BY scheduled_at DESC, id DESC
      `).all(id);
    },

    totalBalanceDue(id: number): number {
      const result = database.prepare(`
        SELECT COALESCE(SUM(
          CASE WHEN status != 'cancelled' AND balance > 0 THEN balance ELSE 0 END
        ), 0) AS total_balance_due
        FROM booking_summary
        WHERE devotee_id = ?
      `).get(id) as { total_balance_due: number };
      return result.total_balance_due;
    },

    create(input: DevoteeInput): Devotee {
      const result = database.prepare(`
        INSERT INTO devotees (name, phone, address, notes)
        VALUES (?, ?, ?, ?)
      `).run(input.name, input.phone, input.address, input.notes);
      return this.findById(Number(result.lastInsertRowid))!;
    },

    update(id: number, input: DevoteeInput): Devotee | undefined {
      const result = database.prepare(`
        UPDATE devotees
        SET name = ?, phone = ?, address = ?, notes = ?
        WHERE id = ?
      `).run(input.name, input.phone, input.address, input.notes, id);
      return result.changes ? this.findById(id) : undefined;
    },

    hasBookings(id: number): boolean {
      return Boolean(database.prepare(
        'SELECT 1 FROM bookings WHERE devotee_id = ? LIMIT 1',
      ).get(id));
    },

    delete(id: number): boolean {
      return database.prepare('DELETE FROM devotees WHERE id = ?').run(id).changes > 0;
    },
  };
}
