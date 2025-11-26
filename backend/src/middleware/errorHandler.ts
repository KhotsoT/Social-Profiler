import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: any;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;
  details?: any;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: string = 'BAD_REQUEST', details?: any) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code: string = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static tooMany(message: string = 'Too many requests', code: string = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }

  static internal(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
    return new ApiError(500, message, code);
  }
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  details?: any;
  stack?: string;
}

/**
 * Central error handling middleware
 */
export const errorHandler = (
  err: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('Error handler:', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    };

    res.status(400).json(response);
    return;
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle custom errors with statusCode
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    const response: ApiResponse = {
      success: false,
      error: err.message || 'Error',
      code: err.code || 'ERROR',
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle database errors
  if (err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
    const response: ApiResponse = {
      success: false,
      error: 'Resource already exists',
      code: 'DUPLICATE_ENTRY',
    };
    res.status(409).json(response);
    return;
  }

  if (err.message?.includes('foreign key') || err.message?.includes('violates foreign key')) {
    const response: ApiResponse = {
      success: false,
      error: 'Referenced resource not found',
      code: 'REFERENCE_ERROR',
    };
    res.status(400).json(response);
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  };
  res.status(404).json(response);
};
