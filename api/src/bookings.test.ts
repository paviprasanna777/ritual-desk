import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './test/test-app';

const openApps: Array<() => void> = [];
const firstTime = '2026-11-01T10:00:00';
const secondTime = '2026-11-02T10:00:00';

async function createBookingFixture() {
  const testApp = createTestApp();
  openApps.push(testApp.close);
  testApp.database.prepare(`
    INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)
  `).run('admin', bcrypt.hashSync('test-password', 4), 'Administrator');
  const homamTypeId = Number(testApp.database.prepare(`
    INSERT INTO homam_types (name, default_amount) VALUES (?, ?)
  `).run('Ganapathi', 1000).lastInsertRowid);
  const devoteeId = Number(testApp.database.prepare(
    'INSERT INTO devotees (name) VALUES (?)',
  ).run('Test Devotee').lastInsertRowid);
  const login = await request(testApp.app)
    .post('/auth/login')
    .send({ username: 'admin', password: 'test-password' });
  const authorization = { Authorization: `Bearer ${login.body.data.token}` };

  return { ...testApp, authorization, homamTypeId, devoteeId };
}

async function postBooking(
  app: Awaited<ReturnType<typeof createBookingFixture>>['app'],
  authorization: Record<string, string>,
  homamTypeId: number,
  devoteeId: number,
  values: Record<string, unknown> = {},
) {
  return request(app).post('/bookings').set(authorization).send({
    homamTypeId,
    devoteeId,
    scheduledAt: firstTime,
    ...values,
  });
}

afterEach(() => {
  while (openApps.length) openApps.pop()?.();
});

describe('bookings and payments', () => {
  it('creates an advance payment atomically and reports the resulting balance', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await createBookingFixture();
    const created = await postBooking(
      app,
      authorization,
      homamTypeId,
      devoteeId,
      { advanceAmount: 250, advanceMode: 'upi' },
    );

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      total_amount: 1000,
      paid_amount: 250,
      balance: 750,
      status: 'scheduled',
      payments: [{
        amount: 250,
        kind: 'advance',
        mode: 'upi',
        paid_on: expect.any(String),
      }],
    });

    const unscheduled = await postBooking(
      app,
      authorization,
      homamTypeId,
      devoteeId,
      { scheduledAt: null },
    );
    expect(unscheduled.status).toBe(201);
    expect(unscheduled.body.data.status).toBe('booked');
    expect(unscheduled.body.data.scheduled_at).toBeNull();

    const advanceTooLarge = await postBooking(
      app,
      authorization,
      homamTypeId,
      devoteeId,
      { scheduledAt: secondTime, advanceAmount: 1001, advanceMode: 'cash' },
    );
    expect(advanceTooLarge.status).toBe(409);
    expect((await request(app)
      .get('/bookings')
      .set(authorization)).body.data).toHaveLength(2);
  });

  it('filters the ordered booking list and rejects an over-payment', async () => {
    const { app, authorization, homamTypeId, devoteeId, database } =
      await createBookingFixture();
    const laterDevoteeId = Number(database.prepare(
      'INSERT INTO devotees (name) VALUES (?)',
    ).run('Second Devotee').lastInsertRowid);
    await postBooking(app, authorization, homamTypeId, devoteeId, {
      scheduledAt: secondTime,
      advanceAmount: 200,
      advanceMode: 'cash',
    });
    const earlier = await postBooking(app, authorization, homamTypeId, laterDevoteeId, {
      scheduledAt: firstTime,
    });

    const all = await request(app).get('/bookings').set(authorization);
    expect(all.body.data.map((booking: { scheduled_at: string }) => booking.scheduled_at))
      .toEqual([firstTime, secondTime]);
    const filtered = await request(app)
      .get(`/bookings?status=scheduled&from=${firstTime}&to=${firstTime}&devoteeId=${laterDevoteeId}&balanceDue=true`)
      .set(authorization);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].id).toBe(earlier.body.data.id);

    const tooMuch = await request(app)
      .post(`/bookings/${earlier.body.data.id}/payments`)
      .set(authorization)
      .send({
        amount: 1001,
        kind: 'part',
        mode: 'cash',
        paidOn: '2026-10-30',
      });
    expect(tooMuch.status).toBe(409);
    expect((await request(app)
      .get(`/bookings/${earlier.body.data.id}`)
      .set(authorization)).body.data.paid_amount).toBe(0);
  });

  it('rejects schedule clashes and permits them with force=true', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await createBookingFixture();
    const original = await postBooking(app, authorization, homamTypeId, devoteeId);
    const clash = await postBooking(app, authorization, homamTypeId, devoteeId);
    expect(clash.status).toBe(409);

    const forced = await request(app)
      .post('/bookings?force=true')
      .set(authorization)
      .send({ homamTypeId, devoteeId, scheduledAt: firstTime });
    expect(forced.status).toBe(201);

    await request(app)
      .post(`/bookings/${original.body.data.id}/cancel`)
      .set(authorization)
      .send({});
    await request(app)
      .post(`/bookings/${forced.body.data.id}/cancel`)
      .set(authorization)
      .send({});
    const afterCancel = await postBooking(app, authorization, homamTypeId, devoteeId);
    expect(afterCancel.status).toBe(201);
  });

  it('collects the balance on completion and blocks subsequent edits', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await createBookingFixture();
    const booking = await postBooking(
      app,
      authorization,
      homamTypeId,
      devoteeId,
      { advanceAmount: 300, advanceMode: 'cash' },
    );
    const completed = await request(app)
      .post(`/bookings/${booking.body.data.id}/complete`)
      .set(authorization)
      .send({ mode: 'upi', paidOn: '2026-11-01' });

    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({
      status: 'completed',
      paid_amount: 1000,
      balance: 0,
      remainingBalance: 0,
      completed_at: expect.any(String),
      payments: [{ kind: 'advance' }, { kind: 'final', amount: 700, mode: 'upi' }],
    });
    const edit = await request(app)
      .put(`/bookings/${booking.body.data.id}`)
      .set(authorization)
      .send({ notes: 'changed' });
    expect(edit.status).toBe(409);
  });

  it('keeps a booking open after a partial completion payment', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await createBookingFixture();
    const booking = await postBooking(app, authorization, homamTypeId, devoteeId);
    const partial = await request(app)
      .post(`/bookings/${booking.body.data.id}/complete`)
      .set(authorization)
      .send({ mode: 'cash', paidOn: '2026-11-01', amount: 400 });

    expect(partial.status).toBe(200);
    expect(partial.body.data).toMatchObject({
      status: 'scheduled',
      balance: 600,
      remainingBalance: 600,
      completed_at: null,
    });
    const finished = await request(app)
      .post(`/bookings/${booking.body.data.id}/complete`)
      .set(authorization)
      .send({ mode: 'cash', paidOn: '2026-11-02' });
    expect(finished.body.data).toMatchObject({
      status: 'completed',
      balance: 0,
      remainingBalance: 0,
    });
  });

  it('cancels with a bounded refund and records cancellation details', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await createBookingFixture();
    const booking = await postBooking(
      app,
      authorization,
      homamTypeId,
      devoteeId,
      { advanceAmount: 600, advanceMode: 'cash' },
    );
    const tooMuch = await request(app)
      .post(`/bookings/${booking.body.data.id}/cancel`)
      .set(authorization)
      .send({ refundAmount: 601 });
    expect(tooMuch.status).toBe(409);

    const cancelled = await request(app)
      .post(`/bookings/${booking.body.data.id}/cancel`)
      .set(authorization)
      .send({ refundAmount: 200, note: 'Customer cancellation' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data).toMatchObject({
      status: 'cancelled',
      cancelled_at: expect.any(String),
      paid_amount: 400,
      balance: 600,
      payments: [
        { kind: 'advance', amount: 600 },
        {
          kind: 'refund',
          amount: 200,
          mode: 'other',
          note: 'Customer cancellation',
        },
      ],
    });

    const payment = await request(app)
      .post(`/bookings/${booking.body.data.id}/payments`)
      .set(authorization)
      .send({
        amount: 1,
        kind: 'part',
        mode: 'cash',
        paidOn: '2026-11-01',
      });
    expect(payment.status).toBe(409);
  });

  it('rechecks clashes when rescheduling a booking', async () => {
    const { app, authorization, homamTypeId, devoteeId } = await createBookingFixture();
    const first = await postBooking(app, authorization, homamTypeId, devoteeId);
    const second = await postBooking(app, authorization, homamTypeId, devoteeId, {
      scheduledAt: secondTime,
    });
    const conflict = await request(app)
      .put(`/bookings/${second.body.data.id}`)
      .set(authorization)
      .send({ scheduledAt: firstTime });
    expect(conflict.status).toBe(409);
    const rescheduled = await request(app)
      .put(`/bookings/${second.body.data.id}`)
      .set(authorization)
      .send({ scheduledAt: '2026-11-03T10:00:00' });
    expect(rescheduled.status).toBe(200);
  });
});
