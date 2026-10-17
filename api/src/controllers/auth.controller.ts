import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { createAuthRepository } from '../repositories/auth.repository';
import { createAuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export function createAuthController(database: Database.Database) {
  const service = createAuthService(createAuthRepository(database));

  const login: RequestHandler = async (request, response, next) => {
    try {
      const { username, password } = request.body as { username: string; password: string };
      sendSuccess(response, await service.login(username, password));
    } catch (error) {
      next(error);
    }
  };

  const me: RequestHandler = (request, response, next) => {
    try {
      sendSuccess(response, service.getCurrentUser(request.user!.id));
    } catch (error) {
      next(error);
    }
  };

  return { login, me };
}
