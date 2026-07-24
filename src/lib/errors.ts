export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR',
    public isOperational: boolean = true,
    public metadata?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Dữ liệu không hợp lệ', metadata?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', true, metadata);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Không có quyền truy cập') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}
export class IdempotencyConflictError extends AppError {
  constructor() {
    super('Idempotency key was already used with a different request.', 409, 'IDEMPOTENCY_KEY_REUSED');
  }
}

export class IdempotencyInProgressError extends AppError {
  constructor() {
    super('A request with this idempotency key is still processing.', 409, 'IDEMPOTENCY_IN_PROGRESS');
  }
}
export class IdempotencyStateError extends AppError {
  constructor(message: string = 'Idempotency record is in an invalid persisted state.') {
    super(message, 503, 'IDEMPOTENCY_STATE_INVALID');
  }
}