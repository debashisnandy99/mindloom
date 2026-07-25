export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly issues?: FieldIssue[];
  readonly isOperational = true;

  constructor(statusCode: number, message: string, issues?: FieldIssue[]) {
    super(message);
    this.statusCode = statusCode;
    this.issues = issues;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", issues?: FieldIssue[]) {
    return new ApiError(400, message, issues);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have access to this resource") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(409, message);
  }

  static payloadTooLarge(message = "Payload too large") {
    return new ApiError(413, message);
  }

  static unprocessable(message = "Unprocessable entity", issues?: FieldIssue[]) {
    return new ApiError(422, message, issues);
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}
