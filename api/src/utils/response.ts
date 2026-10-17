import type { Response } from 'express';

export function sendSuccess<T>(
  response: Response,
  data: T,
  statusCode = 200,
): void {
  response.status(statusCode).json({ success: true, data });
}

export function sendFailure(
  response: Response,
  statusCode: number,
  message: string,
  details?: unknown,
): void {
  response.status(statusCode).json({
    success: false,
    error: message,
    ...(details === undefined ? {} : { details }),
  });
}
