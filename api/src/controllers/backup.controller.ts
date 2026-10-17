import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createTemporaryBackup } from '../services/database-backup.service';
import { logger } from '../utils/logger';

export function createBackupController(database: Database.Database) {
  const download: RequestHandler = async (_request, response, next) => {
    let backup: Awaited<ReturnType<typeof createTemporaryBackup>> | undefined;
    try {
      backup = await createTemporaryBackup(database);
      response.download(backup.filePath, backup.filename, async (error) => {
        try {
          await backup?.cleanup();
        } catch (cleanupError) {
          logger.error('Temporary database backup cleanup failed', cleanupError);
        }
        if (error) {
          if (response.headersSent) response.destroy(error);
          else next(error);
        }
      });
    } catch (error) {
      if (backup) {
        try {
          await backup.cleanup();
        } catch (cleanupError) {
          logger.error('Temporary database backup cleanup failed', cleanupError);
        }
      }
      next(error);
    }
  };
  return { download };
}
