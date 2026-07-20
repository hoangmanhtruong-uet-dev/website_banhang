export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR',
    public isOperational: boolean = true,
    public metadata?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Dữ liệu không hợp lệ', metadata?: any) {
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