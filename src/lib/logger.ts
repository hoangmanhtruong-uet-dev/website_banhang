import { env } from '@/config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private format(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level,
      message,
      ...meta,
      env: env.NODE_ENV,
    };

    if (env.NODE_ENV === 'production') {
      return JSON.stringify(logObj);
    }

    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, error?: any, meta?: any) {
    const errorMeta = error instanceof Error ? {
      error: error.message,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined,
      ...meta
    } : { error, ...meta };
    
    console.error(this.format('error', message, errorMeta));
  }

  debug(message: string, meta?: any) {
    if (env.NODE_ENV === 'development') {
      console.debug(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();