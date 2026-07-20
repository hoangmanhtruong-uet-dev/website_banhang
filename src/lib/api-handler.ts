import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logger } from './logger';

type Handler = (req: NextRequest, params?: any) => Promise<any>;

export function apiHandler(handler: Handler) {
  return async (req: NextRequest, params?: any) => {
    const requestId = crypto.randomUUID();
    try {
      const result = await handler(req, params);
      
      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json(result);
    } catch (error: any) {
      const { status, code, message, metadata } = mapError(error);
      
      if (status >= 500) {
        logger.error(`[API_ERROR] ${req.method} ${req.url}`, error, { requestId });
      } else {
        logger.warn(`[API_WARN] ${req.method} ${req.url}`, { requestId, code, message });
      }

      return NextResponse.json(
        {
          error: {
            code,
            message,
            requestId,
            ...(process.env.NODE_ENV === 'development' ? { metadata, stack: error.stack } : {}),
          },
        },
        { status }
      );
    }
  };
}

export const createHandler = apiHandler;

function mapError(error: any) {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      code: error.code,
      message: error.message,
      metadata: error.metadata,
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      metadata: error.errors,
    };
  }

  if (error.code?.startsWith('P')) {
    return {
      status: 400,
      code: 'DATABASE_ERROR',
      message: 'Lỗi truy vấn dữ liệu',
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
  };
}