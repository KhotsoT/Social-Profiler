import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

type RequestLocation = 'body' | 'query' | 'params';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a Zod schema
 */
export function validate(schema: ZodSchema, location: RequestLocation = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[location];
      const result = schema.parse(data);
      
      // Replace the request data with parsed/transformed data
      req[location] = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation failed', { location, errors });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
        return;
      }

      // Unknown error, pass to error handler
      next(error);
    }
  };
}

/**
 * Validate multiple locations at once
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Array<{ location: string; field: string; message: string }> = [];

    for (const [location, schema] of Object.entries(schemas)) {
      if (schema) {
        try {
          const data = req[location as RequestLocation];
          const result = schema.parse(data);
          req[location as RequestLocation] = result;
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              allErrors.push({
                location,
                field: err.path.join('.'),
                message: err.message,
              });
            });
          }
        }
      }
    }

    if (allErrors.length > 0) {
      logger.warn('Validation failed', { errors: allErrors });

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: allErrors,
      });
      return;
    }

    next();
  };
}





