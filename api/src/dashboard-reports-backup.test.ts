import bcrypt from 'bcrypt';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './test/test-app';

const openApps: Array<() => void> = [];

async function fixture() {
  const testApp = createTestApp();
  openApps.push(testApp.close);
  testApp.database.prepare(`
    INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)
  `).run('admin', bcrypt.hashSync('test-password', 4), 'Administrator');
  const homamTypeId = Number(testApp.database.prepare(
    'INSERT INTO homam_types (name, default_amount) VALUES (?, ?)',
  ).run('Ganapathi', 1000).lastInsertRowid);
  const devoteeId = Number(testApp.database.prepare(
    'INSERT INTO devotees (name) VALUES (?)',
  ).run('Devotee').lastInsertRowid);
  const login = await request(testApp.app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'test-password' });
  return {
    ...testApp,
    homamTypeId,
    devoteeId,
    authorization: { Authorization: `Bearer ${login.body.data.token}` },
  };
}

afterEach(() => {
  while (openApps.length) openApps.pop()?.();
});

describe('GET /dashboard/summary', () => {
  it('aggregates today, next seven days, balances, reminders, and done items', async () => {
    const { app, authorization, database, homamTypeId, devoteeId } = await fixture();
    const today = new Date().toISOString().slice(0, 10);
    const dateAfter = (days: number) => {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const insertBooking = database.prepare(`
      INSERT INTO bookings (
        homam_type_id, devotee_id, scheduled_at, total_amount, status, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const completedId = Number(insertBooking.run(
      homamTypeId, devoteeId, `${today}T08:00:00`, 1000, 'completed',
      `${today}T09:00:00Z`,
    ).lastInsertRowid);
    const todayId = Number(insertBooking.run(
      homamTypeId, devoteeId, `${today}T23:00:00`, 1000, 'scheduled', null,
    ).lastInsertRowid);
    insertBooking.run(
      homamTypeId, devoteeId, `${dateAfter(6)}T10:00:00`, 500, 'scheduled', null,
    );
    insertBooking.run(
      homamTypeId, devoteeId, `${dateAfter(7)}T10:00:00`, 200, 'scheduled', null,
    );
    insertBooking.run(
      homamTypeId, devoteeId, `${today}T12:00:00`, 900, 'cancelled', null,
    );
    database.prepare(`
      INSERT INTO payments (booking_id, amount, kind, mode, paid_on)
      VALUES (?, ?, 'final', 'cash', ?), (?, ?, 'part', 'upi', ?)
    `).run(completedId, 1000, today, todayId, 200, today);
    database.prepare(`
      INSERT INTO rituals (title, type, time) VALUES ('Daily worship', 'daily', '07:00')
    `).run();
    database.prepare(`
      INSERT INTO ritual_log (ritual_id, date, done_at) VALUES (1, ?, CURRENT_TIMESTAMP)
    `).run(today);
    database.prepare(`
      INSERT INTO reminders (title, remind_at, booking_id) VALUES ('Call devotee', ?, NULL)
    `).run(`${today}T12:00:00`);

    const response = await request(app)
      .get('/dashboard/summary')
      .set(authorization);

    expect(response.status).toBe(200);
    const summary = response.body.data;
    expect(summary).toMatchObject({
      todayCount: 3,
      doneToday: 2,
      balanceToCollect: 1500,
      next7DaysCount: 3,
      todaysReminders: [{ title: 'Call devotee', remind_at: `${today}T12:00:00` }],
    });
    expect(summary.todaysItems.map((item: { type: string; id: number }) =>
      `${item.type}:${item.id}`,
    )).toEqual(['ritual:1', `booking:${completedId}`, `booking:${todayId}`]);
    expect(summary.todaysItems[0]).toMatchObject({ done: true, status: 'done' });
    expect(summary.balanceDue.map((booking: { id: number; balance: number }) =>
      [booking.id, booking.balance],
    )).toEqual([[todayId, 800], [3, 500], [4, 200]]);
    expect(summary.upcoming.map((booking: { scheduled_at: string }) =>
      booking.scheduled_at,
    )).toEqual([
      `${today}T23:00:00`,
      `${dateAfter(6)}T10:00:00`,
      `${dateAfter(7)}T10:00:00`,
    ]);
  });
});

describe('GET /history', () => {
  it('returns this month’s completed and cancelled bookings and totals', async () => {
    const { app, authorization, database, homamTypeId, devoteeId } = await fixture();
    const completedId = Number(database.prepare(`
      INSERT INTO bookings (
        homam_type_id, devotee_id, scheduled_at, total_amount, status, completed_at
      ) VALUES (?, ?, ?, ?, 'completed', ?)
    `).run(
      homamTypeId,
      devoteeId,
      '2026-09-20T10:00:00',
      800,
      '2026-10-12T12:00:00Z',
    ).lastInsertRowid);
    const cancelledId = Number(database.prepare(`
      INSERT INTO bookings (
        homam_type_id, devotee_id, scheduled_at, total_amount, status, cancelled_at
      ) VALUES (?, ?, ?, ?, 'cancelled', ?)
    `).run(
      homamTypeId,
      devoteeId,
      '2026-10-01T10:00:00',
      400,
      '2026-10-15T12:00:00Z',
    ).lastInsertRowid);
    database.prepare(`
      INSERT INTO payments (booking_id, amount, kind, mode, paid_on)
      VALUES (?, 800, 'final', 'cash', '2026-10-12'),
             (?, 100, 'refund', 'cash', '2026-10-15')
    `).run(completedId, cancelledId);

    const response = await request(app)
      .get('/history?month=2026-10')
      .set(authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.items.map((booking: { id: number }) => booking.id))
      .toEqual([cancelledId, completedId]);
    expect(response.body.data.totals).toEqual({
      totalCharged: 1200,
      totalCollected: 700,
      totalDue: 0,
    });
  });
});

describe('GET /reports/payments', () => {
  it('aggregates scheduled-month charges, net collections, balances, modes, and payments', async () => {
    const { app, authorization, database, homamTypeId, devoteeId } = await fixture();
    const firstBooking = Number(database.prepare(`
      INSERT INTO bookings (
        homam_type_id, devotee_id, scheduled_at, total_amount, status
      ) VALUES (?, ?, ?, ?, ?)
    `).run(homamTypeId, devoteeId, '2026-10-10T10:00:00', 1000, 'scheduled').lastInsertRowid);
    const secondBooking = Number(database.prepare(`
      INSERT INTO bookings (
        homam_type_id, devotee_id, scheduled_at, total_amount, status, cancelled_at
      ) VALUES (?, ?, ?, ?, 'cancelled', ?)
    `).run(
      homamTypeId, devoteeId, '2026-10-15T10:00:00', 500, '2026-10-16T10:00:00Z',
    ).lastInsertRowid);
    const insertPayment = database.prepare(`
      INSERT INTO payments (booking_id, amount, kind, mode, paid_on)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertPayment.run(firstBooking, 400, 'advance', 'cash', '2026-10-10');
    insertPayment.run(firstBooking, 50, 'refund', 'upi', '2026-10-11');
    insertPayment.run(secondBooking, 500, 'advance', 'other', '2026-10-15');
    insertPayment.run(secondBooking, 100, 'refund', 'cash', '2026-10-16');

    const response = await request(app)
      .get('/reports/payments?month=2026-10')
      .set(authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      totalCharged: 1500,
      totalCollected: 750,
      totalDue: 650,
      breakdown: { cash: 300, upi: -50, other: 500 },
    });
    expect(response.body.data.payments).toHaveLength(4);
    expect(response.body.data.payments[0]).toMatchObject({
      booking_id: secondBooking,
      kind: 'refund',
      amount: 100,
      devotee_name: 'Devotee',
      homam_name: 'Ganapathi',
    });
  });
});

describe('GET /backup', () => {
  it('streams a valid SQLite backup with a safe download filename', async () => {
    const { app, authorization, database } = await fixture();
    database.prepare('INSERT INTO devotees (name) VALUES (?)').run('Backed up');
    const response = await request(app)
      .get('/backup')
      .set(authorization)
      .buffer(true)
      .parse((incoming, callback) => {
        const chunks: Buffer[] = [];
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
        incoming.on('end', () => callback(null, Buffer.concat(chunks)));
        incoming.on('error', callback);
      });
    const downloaded = response.body as Buffer;
    expect(response.status).toBe(200);
    expect(response.headers['content-disposition'])
      .toMatch(/^attachment; filename="ritualdesk-\d{4}-\d{2}-\d{2}\.db"$/);
    expect(downloaded.subarray(0, 16).toString('utf8')).toBe('SQLite format 3\0');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ritual-desk-test-'));
    const filePath = path.join(directory, 'restored.db');
    await fs.writeFile(filePath, downloaded);
    const copy = new Database(filePath);
    try {
      expect(copy.prepare('SELECT name FROM devotees WHERE name = ?').get('Backed up'))
        .toEqual({ name: 'Backed up' });
    } finally {
      copy.close();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
