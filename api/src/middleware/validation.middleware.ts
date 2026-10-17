import type { RequestHandler } from 'express';
import type { z } from 'zod';

export function validateBody<TSchema extends z.ZodType>(
  schema: TSchema,
): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(result.error);
      return;
    }

    request.body = result.data;
    next();
  };
}
