import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/response.util';
import logger from '../utils/logger.util';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg as string);
    res.status(400).json(errorResponse('Validation failed', messages));
    return;
  }
  next();
}

export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });

  const status = err.status ?? err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message;

  res.status(status).json(errorResponse(message));
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json(errorResponse(`Route ${req.method} ${req.path} not found`));
}
