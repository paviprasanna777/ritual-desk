import type Database from 'better-sqlite3';

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  name: string;
}

export function createAuthRepository(database: Database.Database) {
  return {
    findByUsername(username: string): UserRecord | undefined {
      return database.prepare(`
        SELECT id, username, password_hash, name
        FROM users
        WHERE username = ?
      `).get(username) as UserRecord | undefined;
    },

    findById(id: number): Omit<UserRecord, 'password_hash'> | undefined {
      return database.prepare(`
        SELECT id, username, name
        FROM users
        WHERE id = ?
      `).get(id) as Omit<UserRecord, 'password_hash'> | undefined;
    },
  };
}
