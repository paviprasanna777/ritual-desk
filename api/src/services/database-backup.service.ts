import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';

export interface TemporaryBackup {
  directory: string;
  filePath: string;
  filename: string;
  cleanup(): Promise<void>;
}

export async function createTemporaryBackup(
  database: Database.Database,
): Promise<TemporaryBackup> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ritual-desk-download-'));
  const filename = `ritualdesk-${new Date().toISOString().slice(0, 10)}.db`;
  const filePath = path.join(directory, filename);
  try {
    await database.backup(filePath);
    return {
      directory,
      filePath,
      filename,
      cleanup: () => fs.rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }
}
