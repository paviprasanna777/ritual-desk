import { afterAll } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters';

afterAll(async () => {
  const { db } = await import('../config/database');
  if (db.open) {
    db.close();
  }
});
