import type Database from 'better-sqlite3';

export interface RitualInput {
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'festival' | 'special';
  time: string | null;
  daysOfWeek: string | null;
  dayOfMonth: number | null;
  date: string | null;
  notes: string | null;
  active?: number;
}

export interface Ritual extends RitualInput {
  id: number;
  active: number;
}

function toRitual(row: Record<string, unknown>): Ritual {
  return {
    id: row.id as number,
    title: row.title as string,
    type: row.type as Ritual['type'],
    time: row.time as string | null,
    daysOfWeek: row.days_of_week as string | null,
    dayOfMonth: row.day_of_month as number | null,
    date: row.date as string | null,
    notes: row.notes as string | null,
    active: row.active as number,
  };
}

export function createRitualsRepository(database: Database.Database) {
  return {
    list(): Ritual[] {
      return (database.prepare(`
        SELECT id, title, type, time, days_of_week, day_of_month, date, notes, active
        FROM rituals
        ORDER BY title COLLATE NOCASE, id
      `).all() as Array<Record<string, unknown>>).map(toRitual);
    },

    findById(id: number): Ritual | undefined {
      const row = database.prepare(`
        SELECT id, title, type, time, days_of_week, day_of_month, date, notes, active
        FROM rituals
        WHERE id = ?
      `).get(id) as Record<string, unknown> | undefined;
      return row ? toRitual(row) : undefined;
    },

    create(input: RitualInput): Ritual {
      const result = database.prepare(`
        INSERT INTO rituals (title, type, time, days_of_week, day_of_month, date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.title,
        input.type,
        input.time,
        input.daysOfWeek,
        input.dayOfMonth,
        input.date,
        input.notes,
      );
      return this.findById(Number(result.lastInsertRowid))!;
    },

    update(id: number, input: RitualInput): Ritual | undefined {
      const result = database.prepare(`
        UPDATE rituals
        SET title = ?, type = ?, time = ?, days_of_week = ?, day_of_month = ?,
            date = ?, notes = ?, active = COALESCE(?, active)
        WHERE id = ?
      `).run(
        input.title,
        input.type,
        input.time,
        input.daysOfWeek,
        input.dayOfMonth,
        input.date,
        input.notes,
        input.active ?? null,
        id,
      );
      return result.changes ? this.findById(id) : undefined;
    },

    delete(id: number): boolean {
      return database.prepare('DELETE FROM rituals WHERE id = ?').run(id).changes > 0;
    },

    log(id: number, date: string): void {
      database.prepare(`
        INSERT INTO ritual_log (ritual_id, date, done_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(ritual_id, date) DO NOTHING
      `).run(id, date);
    },

    removeLog(id: number, date: string): boolean {
      return database.prepare(
        'DELETE FROM ritual_log WHERE ritual_id = ? AND date = ?',
      ).run(id, date).changes > 0;
    },
  };
}
