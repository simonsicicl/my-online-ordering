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
  return {
    statusCode: appError.statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: false,
      error: {
        code:    appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
      timestamp: new Date().toISOString(),
    }),
  };
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.log(JSON.stringify({ level: 'error', message, stack: error instanceof Error ? error.stack : undefined }));
  return new AppError('INTERNAL_ERROR', message, 500);
}
