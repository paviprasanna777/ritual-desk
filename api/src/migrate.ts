import { db, migrateDatabase } from './config/database';
import { logger } from './utils/logger';

try {
  migrateDatabase(db);
  logger.info('Database migrations applied');
} finally {
  db.close();
}
