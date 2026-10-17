import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase } from './config/database';
import { projectRoot } from './config/environment';

describe('booking schedule migration', () => {
  let database: ReturnType<typeof createDatabase> | undefined;

  afterEach(() => {
    if (database?.open) database.close();
    database = undefined;
  });

  it('makes schedules optional while preserving existing payments and reminders', () => {
    database = createDatabase(':memory:');
    const initialMigration = fs.readFileSync(
      path.join(projectRoot, 'database', 'migrations', '001_init.sql'),
      'utf8',
    ).replace('scheduled_at TEXT,', 'scheduled_at TEXT NOT NULL,');
    database.exec(initialMigration);
    database.exec(`
      CREATE TABLE schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO schema_migrations (name) VALUES ('001_init.sql');
      INSERT INTO homam_types (name) VALUES ('Ganapathi');
      INSERT INTO devotees (name) VALUES ('Test devotee');
      INSERT INTO bookings (homam_type_id, devotee_id, scheduled_at, total_amount)
        VALUES (1, 1, '2026-11-01T10:00:00', 1000);
      INSERT INTO payments (booking_id, amount, kind, mode, paid_on)
        VALUES (1, 250, 'advance', 'cash', '2026-10-30');
      INSERT INTO reminders (title, remind_at, booking_id)
        VALUES ('Booking reminder', '2026-10-31', 1);
    `);

    migrateDatabase(database);

    expect(database.prepare(
      'SELECT amount, booking_id FROM payments',
    ).all()).toEqual([{ amount: 250, booking_id: 1 }]);
    expect(database.prepare(
      'SELECT title, booking_id FROM reminders',
    ).all()).toEqual([{ title: 'Booking reminder', booking_id: 1 }]);
    expect(database.prepare(
      'SELECT auto_created FROM reminders',
    ).get()).toEqual({ auto_created: 0 });
    expect(database.prepare(
      "PRAGMA table_info('bookings')",
    ).all().find((column) => (column as { name: string }).name === 'scheduled_at'))
      .toMatchObject({ notnull: 0 });
    expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
