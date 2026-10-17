import type { RequestHandler } from 'express';
import { verifyToken } from '../services/jwt.service';
import { sendFailure } from '../utils/response';

export const authMiddleware: RequestHandler = (request, response, next) => {
  const authorization = request.get('authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  const user = match ? verifyToken(match[1]) : undefined;
  if (!user) {
    sendFailure(response, 401, 'Unauthorized');
    return;
  }

  request.user = user;
  next();
};
