import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env, projectRoot } from './environment';

export function createDatabase(databasePath: string): Database.Database {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  return database;
}

export function migrateDatabase(
  database: Database.Database,
  migrationsDirectory = path.join(projectRoot, 'database', 'migrations'),
): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationFiles = fs.readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  const hasMigration = database.prepare(
    'SELECT 1 FROM schema_migrations WHERE name = ?',
  );
  const recordMigration = database.prepare(
    'INSERT INTO schema_migrations (name) VALUES (?)',
  );

  for (const filename of migrationFiles) {
    if (hasMigration.get(filename)) {
      continue;
    }

    const migration = fs.readFileSync(
      path.join(migrationsDirectory, filename),
      'utf8',
    );
    database.transaction(() => {
      database.exec(migration);
      recordMigration.run(filename);
    })();
  }
}

export const db = createDatabase(env.DB_PATH);
