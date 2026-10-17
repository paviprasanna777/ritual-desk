import bcrypt from 'bcrypt';
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
  ).run('Ganapathi', 500).lastInsertRowid);
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

describe('rituals and schedule', () => {
  it('supports ritual CRUD, idempotent logging, and generated schedule status', async () => {
    const { app, authorization } = await fixture();
    const created = await request(app).post('/rituals').set(authorization).send({
      title: 'Weekend worship',
      type: 'weekly',
      time: '08:00',
      daysOfWeek: '0,6',
    });
    expect(created.status).toBe(201);

    const update = await request(app).put(`/rituals/${created.body.data.id}`)
      .set(authorization)
      .send({
        title: 'Updated worship',
        type: 'weekly',
        time: '09:00',
        daysOfWeek: '0,6',
      });
    expect(update.body.data).toMatchObject({ title: 'Updated worship', time: '09:00' });
    const deactivated = await request(app).put(`/rituals/${created.body.data.id}`)
      .set(authorization)
      .send({
        title: 'Updated worship',
        type: 'weekly',
        time: '09:00',
        daysOfWeek: '0,6',
        active: 0,
      });
    expect(deactivated.body.data.active).toBe(0);
    expect((await request(app)
      .get('/schedule?from=2026-10-17&to=2026-10-18')
      .set(authorization)).body.data).toEqual([]);
    const reactivated = await request(app).put(`/rituals/${created.body.data.id}`)
      .set(authorization)
      .send({
        title: 'Updated worship',
        type: 'weekly',
        time: '09:00',
        daysOfWeek: '0,6',
        active: 1,
      });
    expect(reactivated.body.data.active).toBe(1);

    const log = { date: '2026-10-17' };
    expect((await request(app).post(`/rituals/${created.body.data.id}/log`)
      .set(authorization).send(log)).status).toBe(200);
    expect((await request(app).post(`/rituals/${created.body.data.id}/log`)
      .set(authorization).send(log)).body.data.done).toBe(true);
    const schedule = await request(app)
      .get('/schedule?from=2026-10-17&to=2026-10-18')
      .set(authorization);
    expect(schedule.status).toBe(200);
    expect(schedule.body.data).toMatchObject([
      {
        type: 'ritual',
        id: created.body.data.id,
        title: 'Updated worship',
        time: '2026-10-17T09:00',
        status: 'done',
        done: true,
      },
      {
        type: 'ritual',
        id: created.body.data.id,
        time: '2026-10-18T09:00',
        status: 'pending',
        done: false,
      },
    ]);
    expect((await request(app)
      .get('/schedule?from=2026-10-01&to=2026-12-02')
      .set(authorization)).status).toBe(400);
    expect((await request(app)
      .get('/schedule?from=2026-10-01&to=2026-12-01')
      .set(authorization)).status).toBe(200);
    expect((await request(app).delete(
      `/rituals/${created.body.data.id}/log/2026-10-17`,
    ).set(authorization)).body.data.done).toBe(false);
    const removed = await request(app)
      .delete(`/rituals/${created.body.data.id}`)
      .set(authorization);
    expect(removed.status).toBe(200);
    expect((await request(app)
      .get('/rituals')
      .set(authorization)).body.data).toEqual([]);
  });

  it('combines ritual occurrences and non-cancelled bookings in time order', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await fixture();
    await request(app).post('/rituals').set(authorization).send({
      title: 'Morning ritual',
      type: 'daily',
      time: '07:00',
    });
    const booking = await request(app).post('/bookings').set(authorization).send({
      homamTypeId,
      devoteeId,
      scheduledAt: '2026-10-17T06:00:00',
    });
    expect(booking.status).toBe(201);

    const schedule = await request(app)
      .get('/schedule?from=2026-10-17&to=2026-10-17')
      .set(authorization);
    expect(schedule.body.data.map((item: { type: string; time: string }) => [
      item.type, item.time,
    ])).toEqual([
      ['booking', '2026-10-17T06:00:00'],
      ['ritual', '2026-10-17T07:00'],
    ]);
    const cancelled = await request(app)
      .post(`/bookings/${booking.body.data.id}/cancel`)
      .set(authorization)
      .send({});
    expect(cancelled.status).toBe(200);
    expect((await request(app)
      .get('/schedule?from=2026-10-17&to=2026-10-17')
      .set(authorization)).body.data.map((item: { type: string }) => item.type))
      .toEqual(['ritual']);
  });
});

describe('reminders', () => {
  it('supports CRUD and filters reminders by calendar day', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await fixture();
    const booking = await request(app).post('/bookings').set(authorization).send({
      homamTypeId,
      devoteeId,
      scheduledAt: '2026-10-20T11:30:00',
    });
    expect(booking.status).toBe(201);
    const auto = await request(app)
      .get('/reminders?date=2026-10-19')
      .set(authorization);
    expect(auto.body.data).toMatchObject([{
      title: 'Booking reminder (day before)',
      remind_at: '2026-10-19T18:00:00',
      booking_id: booking.body.data.id,
      auto_created: 1,
    }]);
    expect((await request(app)
      .get('/reminders?date=2026-10-20')
      .set(authorization)).body.data[0].remind_at).toBe('2026-10-20T06:00:00');

    const manual = await request(app).post('/reminders').set(authorization).send({
      title: 'Call devotee',
      remindAt: '2026-10-19T10:00:00',
      bookingId: booking.body.data.id,
    });
    expect(manual.status).toBe(201);
    expect(manual.body.data.auto_created).toBe(0);
    const updated = await request(app).put(`/reminders/${manual.body.data.id}`)
      .set(authorization)
      .send({ done: true });
    expect(updated.body.data.done).toBe(1);
    expect((await request(app)
      .get(`/reminders/${manual.body.data.id}`)
      .set(authorization)).body.data.title).toBe('Call devotee');
    expect((await request(app)
      .delete(`/reminders/${manual.body.data.id}`)
      .set(authorization)).body.data.deleted).toBe(true);
  });

  it('replaces reminders when rescheduled and removes them on cancel or completion', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await fixture();
    const firstDate = '2026-10-20';
    const booking = await request(app).post('/bookings').set(authorization).send({
      homamTypeId,
      devoteeId,
      scheduledAt: `${firstDate}T11:30:00`,
    });
    const bookingId = booking.body.data.id as number;
    const manual = await request(app).post('/reminders').set(authorization).send({
      title: 'Keep this reminder',
      remindAt: `${firstDate}T07:00:00`,
      bookingId,
    });
    const nextDate = '2026-10-22';
    const update = await request(app).put(`/bookings/${bookingId}`)
      .set(authorization)
      .send({ scheduledAt: `${nextDate}T15:00:00` });
    expect(update.status).toBe(200);
    expect((await request(app)
      .get('/reminders')
      .set(authorization)).body.data).toMatchObject([
      { id: manual.body.data.id, title: 'Keep this reminder', auto_created: 0 },
      {
        title: 'Booking reminder (day before)',
        remind_at: '2026-10-21T18:00:00',
        auto_created: 1,
      },
      {
        title: 'Booking reminder (same day)',
        remind_at: '2026-10-22T06:00:00',
        auto_created: 1,
      },
    ]);
    const cancelled = await request(app).post(`/bookings/${bookingId}/cancel`)
      .set(authorization).send({});
    expect(cancelled.status).toBe(200);
    expect((await request(app)
      .get('/reminders')
      .set(authorization)).body.data).toMatchObject([
      { id: manual.body.data.id, auto_created: 0 },
    ]);

    const secondBooking = await request(app).post('/bookings').set(authorization).send({
      homamTypeId,
      devoteeId,
      scheduledAt: '2026-10-24T10:00:00',
    });
    const completed = await request(app)
      .post(`/bookings/${secondBooking.body.data.id}/complete`)
      .set(authorization)
      .send({ mode: 'cash', paidOn: '2026-10-24' });
    expect(completed.body.data.status).toBe('completed');
    expect((await request(app)
      .get('/reminders')
      .set(authorization)).body.data).toMatchObject([
      { id: manual.body.data.id, auto_created: 0 },
    ]);
  });
});
