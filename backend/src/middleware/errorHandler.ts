import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Error handler:', {
    message: err.message,
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Always return error details (not just in development)
  res.status(statusCode).json({
    error: message,
    message: err.message || 'Internal Server Error',
    ...(err.stack && { stack: err.stack }),
    ...(process.env.NODE_ENV === 'development' && { 
      fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    }),
  });
};

