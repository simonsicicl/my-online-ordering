import { AppError } from './errors';

export function successResponse(data: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
  };
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);
  console.log(JSON.stringify({
    level:   'error',
    message: appError.message,
    stack:   error instanceof Error ? error.stack : undefined,
  }));
  return {
    statusCode: appError.statusCode,
    headers:    { 'Content-Type': 'application/json' },
    body:       JSON.stringify({
      success:   false,
      error:     { code: appError.code, message: appError.message },
      timestamp: new Date().toISOString(),
    }),
  };
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Internal server error';
  return new AppError('INTERNAL_ERROR', message, 500);
}
