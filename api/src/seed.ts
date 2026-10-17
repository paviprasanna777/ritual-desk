import bcrypt from 'bcrypt';
import { db, migrateDatabase } from './config/database';
import { env } from './config/environment';
import { logger } from './utils/logger';

const homamTypes = [
  'Ganapathi',
  'Navagraha',
  'Sudarshana',
  'Mrityunjaya',
  'Satyanarayana',
];

async function seedDatabase(): Promise<void> {
  if (!env.SEED_USER || !env.SEED_PASSWORD) {
    throw new Error('SEED_USER and SEED_PASSWORD must be set before seeding');
  }

  migrateDatabase(db);
  const passwordHash = await bcrypt.hash(env.SEED_PASSWORD, 12);
  const insertSeedData = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (username, password_hash, name)
      VALUES (?, ?, ?)
      ON CONFLICT(username) DO NOTHING
    `).run(env.SEED_USER, passwordHash, env.SEED_USER);

    const insertHomamType = db.prepare(`
      INSERT INTO homam_types (name, default_amount)
      VALUES (?, 0)
      ON CONFLICT(name) DO NOTHING
    `);

    for (const name of homamTypes) {
      insertHomamType.run(name);
    }
  });

  insertSeedData();
  logger.info('Seed data applied');
}

void seedDatabase().then(
  () => db.close(),
  (error: unknown) => {
    logger.error('Database seeding failed', error);
    db.close();
    process.exitCode = 1;
  },
);
