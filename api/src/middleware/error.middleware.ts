import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { sendFailure } from '../utils/response';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof HttpError) {
    sendFailure(response, error.statusCode, error.message);
    return;
  }

  if (error instanceof ZodError) {
    sendFailure(response, 400, 'Validation failed', error.issues);
    return;
  }

  logger.error('Unhandled request error', error);
  sendFailure(response, 500, 'Internal server error');
};
