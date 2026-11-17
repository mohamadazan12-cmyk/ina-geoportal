import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseFormatter';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  sendError(res, code, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
}
