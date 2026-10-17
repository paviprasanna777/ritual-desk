import { createApp } from '../app';
import { createDatabase, migrateDatabase } from '../config/database';

export function createTestApp() {
  const database = createDatabase(':memory:');
  migrateDatabase(database);

  return {
    app: createApp(database),
    database,
    close: () => database.close(),
  };
}
