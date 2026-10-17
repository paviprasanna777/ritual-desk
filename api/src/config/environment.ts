import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const currentDirectory = path.dirname(__filename);
export const projectRoot = path.resolve(currentDirectory, '../../..');
const apiDirectory = path.resolve(projectRoot, 'api');

dotenv.config({ path: path.join(apiDirectory, '.env') });

const configuredPath = (value: string, fallback: string): string =>
  value === ':memory:' ? value : path.resolve(projectRoot, value || fallback);

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_PATH: z.string().trim().default('').transform((value) =>
    configuredPath(value, 'database/ritual-desk.sqlite'),
  ),
  SEED_USER: z.string().trim().min(1).optional(),
  SEED_PASSWORD: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().trim()
    .regex(/^\d+[smhd]$/)
    .refine((value) => {
      const amount = Number(value.slice(0, -1));
      return Number.isSafeInteger(amount) && amount > 0;
    })
    .default('30d'),
  BACKUP_DIR: z.string().trim().default('').transform((value) =>
    configuredPath(value, 'api/backups'),
  ),
});

export const env = environmentSchema.parse(process.env);
