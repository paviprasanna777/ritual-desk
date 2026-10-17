import fs from 'node:fs';
import path from 'node:path';
import { db } from './config/database';
import { env } from './config/environment';
import { logger } from './utils/logger';

async function createBackup(): Promise<void> {
  fs.mkdirSync(env.BACKUP_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(env.BACKUP_DIR, `ritualdesk-${date}.db`);
  fs.rmSync(backupPath, { force: true });
  await db.backup(backupPath);
  logger.info(`Database backup created at ${backupPath}`);
}

void createBackup().then(
  () => db.close(),
  (error: unknown) => {
    logger.error('Database backup failed', error);
    db.close();
    process.exitCode = 1;
  },
);
