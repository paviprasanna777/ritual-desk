import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './test/test-app';

const openApps: Array<() => void> = [];

function createSeededApp() {
  const testApp = createTestApp();
  openApps.push(testApp.close);
  const passwordHash = bcrypt.hashSync('correct-password', 4);
  testApp.database.prepare(`
    INSERT INTO users (username, password_hash, name)
    VALUES (?, ?, ?)
  `).run('admin', passwordHash, 'Administrator');
  return testApp;
}

afterEach(() => {
  while (openApps.length) openApps.pop()?.();
});

describe('authentication', () => {
  it('logs in and returns a bearer token accepted by /auth/me', async () => {
    const { app } = createSeededApp();
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'correct-password' });

    expect(login.status).toBe(200);
    expect(login.body.data.token).toEqual(expect.any(String));
    expect(login.body.data.user).toEqual({
      id: 1,
      username: 'admin',
      name: 'Administrator',
    });
    const [, encodedPayload] = login.body.data.token.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    expect(payload.exp - payload.iat).toBe(30 * 24 * 60 * 60);

    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data).toEqual({ id: 1, username: 'admin', name: 'Administrator' });
  });

  it('rejects incorrect credentials with a generic error', async () => {
    const { app } = createSeededApp();
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');

    const unknownUser = await request(app)
      .post('/auth/login')
      .send({ username: 'unknown', password: 'wrong-password' });
    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body.error).toBe(response.body.error);
  });

  it('rejects protected endpoints without a token', async () => {
    const { app } = createSeededApp();
    const response = await request(app).get('/homams');
    expect(response.status).toBe(401);
  });
});

describe('homam types', () => {
  it('creates, lists, updates, and soft-deletes homam types', async () => {
    const { app, database } = createSeededApp();
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'correct-password' });
    const authorization = { Authorization: `Bearer ${login.body.data.token}` };
    const input = {
      name: 'Ganapathi Homam',
      default_amount: 5000,
      duration_mins: 90,
      items_needed: ['Coconut', 'Flowers'],
      notes: 'Morning only',
    };

    const created = await request(app).post('/homams').set(authorization).send(input);
    expect(created.status).toBe(201);
    expect(created.body.data.items_needed).toEqual(input.items_needed);

    const updatedInput = { ...input, name: 'Updated Ganapathi', items_needed: ['Flowers'] };
    const updated = await request(app)
      .put(`/homams/${created.body.data.id}`)
      .set(authorization)
      .send(updatedInput);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      name: updatedInput.name,
      items_needed: updatedInput.items_needed,
    });

    const removed = await request(app)
      .delete(`/homams/${created.body.data.id}`)
      .set(authorization);
    expect(removed.status).toBe(200);
    expect(database.prepare(
      'SELECT active, items_needed FROM homam_types WHERE id = ?',
    ).get(created.body.data.id)).toEqual({
      active: 0,
      items_needed: JSON.stringify(updatedInput.items_needed),
    });
    expect((await request(app).get('/homams').set(authorization)).body.data).toEqual([]);
    expect((await request(app).get('/homams?all=true').set(authorization)).body.data[0])
      .toMatchObject({ active: 0, items_needed: updatedInput.items_needed });
  });
});

describe('devotees', () => {
  it('searches alphabetically and rejects deletion when bookings exist', async () => {
    const { app, database } = createSeededApp();
    const login = await request(app)
      .post('/auth/login')
      .send({ username: 'admin', password: 'correct-password' });
    const authorization = { Authorization: `Bearer ${login.body.data.token}` };
    const homamTypeId = Number(database.prepare(
      'INSERT INTO homam_types (name) VALUES (?)',
    ).run('Test homam').lastInsertRowid);
    const laterName = await request(app).post('/devotees').set(authorization).send({
      name: 'Zara Patel',
      phone: '555-0100',
    });
    const earlierName = await request(app).post('/devotees').set(authorization).send({
      name: 'Asha Patel',
      phone: '555-0101',
    });

    expect(laterName.status).toBe(201);
    expect(earlierName.status).toBe(201);
    const search = await request(app).get('/devotees?search=555-01').set(authorization);
    expect(search.body.data.map((devotee: { name: string }) => devotee.name))
      .toEqual(['Asha Patel', 'Zara Patel']);

    const bookingId = Number(database.prepare(`
      INSERT INTO bookings (homam_type_id, devotee_id, scheduled_at, total_amount)
      VALUES (?, ?, ?, ?)
    `).run(
      homamTypeId,
      laterName.body.data.id,
      '2026-10-17T09:00:00',
      1250,
    ).lastInsertRowid);
    const detail = await request(app)
      .get(`/devotees/${laterName.body.data.id}`)
      .set(authorization);
    expect(detail.body.data.bookings).toHaveLength(1);
    expect(detail.body.data.bookings[0].id).toBe(bookingId);
    expect(detail.body.data.total_balance_due).toBe(1250);

    const deletion = await request(app)
      .delete(`/devotees/${laterName.body.data.id}`)
      .set(authorization);
    expect(deletion.status).toBe(409);
    expect(deletion.body.error).toBe('Cannot delete a devotee with bookings');

    const update = await request(app)
      .put(`/devotees/${earlierName.body.data.id}`)
      .set(authorization)
      .send({
        name: 'Asha Updated',
        phone: '555-0199',
        address: 'Updated address',
        notes: 'Updated notes',
      });
    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({
      name: 'Asha Updated',
      phone: '555-0199',
    });

    const removeWithoutBookings = await request(app)
      .delete(`/devotees/${earlierName.body.data.id}`)
      .set(authorization);
    expect(removeWithoutBookings.status).toBe(200);
    expect((await request(app)
      .get(`/devotees/${earlierName.body.data.id}`)
      .set(authorization)).status).toBe(404);
  });
});
