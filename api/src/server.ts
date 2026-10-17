import { createApp } from './app';
import { db, migrateDatabase } from './config/database';
import { env } from './config/environment';
import { logger } from './utils/logger';

migrateDatabase(db);

const app = createApp(db);
app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`RitualDesk API listening on 0.0.0.0:${env.PORT}`);
});
