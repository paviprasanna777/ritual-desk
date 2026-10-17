import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './test/test-app';

describe('GET /health', () => {
  let closeDatabase: (() => void) | undefined;

  afterEach(() => {
    closeDatabase?.();
    closeDatabase = undefined;
  });

  it('reports that the API and database are ready', async () => {
    const testApp = createTestApp();
    closeDatabase = testApp.close;

    const response = await request(testApp.app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    });
    expect(
      testApp.database.prepare(
        'SELECT name FROM schema_migrations ORDER BY name',
      ).all(),
    ).toEqual([
      { name: '001_init.sql' },
      { name: '002_nullable_booking_schedule.sql' },
      { name: '003_auto_created_reminders.sql' },
    ]);
  });

  it('calculates booking balances with refunds deducted from payments', () => {
    const { database, close } = createTestApp();
    closeDatabase = close;

    const homamTypeId = Number(
      database.prepare(
        'INSERT INTO homam_types (name) VALUES (?)',
      ).run('Ganapathi').lastInsertRowid,
    );
    const devoteeId = Number(
      database.prepare(
        'INSERT INTO devotees (name) VALUES (?)',
      ).run('Test devotee').lastInsertRowid,
    );
    const bookingId = Number(
      database.prepare(`
        INSERT INTO bookings (homam_type_id, devotee_id, scheduled_at, total_amount)
        VALUES (?, ?, ?, ?)
      `).run(homamTypeId, devoteeId, '2026-10-16T09:00:00', 100).lastInsertRowid,
    );
    const insertPayment = database.prepare(`
      INSERT INTO payments (booking_id, amount, kind, mode, paid_on)
      VALUES (?, ?, ?, 'cash', ?)
    `);
    insertPayment.run(bookingId, 50, 'advance', '2026-10-01');
    insertPayment.run(bookingId, 10, 'refund', '2026-10-02');

    const summary = database.prepare(
      'SELECT homam_name, devotee_name, paid_amount, balance FROM booking_summary WHERE id = ?',
    ).get(bookingId);

    expect(summary).toEqual({
      homam_name: 'Ganapathi',
      devotee_name: 'Test devotee',
      paid_amount: 40,
      balance: 60,
    });
  });
});
