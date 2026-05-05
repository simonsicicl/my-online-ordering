import { type ZodSchema } from 'zod';
import { AppError } from './errors';

export function validateBody<T>(body: string | null | undefined, schema: ZodSchema<T>): T {
  if (!body) throw new AppError('VALIDATION_ERROR', 'Request body is required', 400);

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid JSON', 400);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    );
  }
  return result.data;
}
