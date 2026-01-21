/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Error for not found resources
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error for unauthorized access
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error for forbidden access
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error for conflicts (e.g., duplicate records)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details = null) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Error for booking conflicts (double-booking)
 */
export class BookingConflictError extends ConflictError {
  constructor(availabilityData) {
    super(
      'Glamp is not available for selected dates',
      availabilityData
    );
    this.name = 'BookingConflictError';
  }
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
