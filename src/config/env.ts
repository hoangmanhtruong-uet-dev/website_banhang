import { z } from 'zod';
import { parseRefreshTokenTtlSeconds } from './refresh-token';

const refreshTokenTtlSchema = z.string().optional().transform((value, context) => {
  try {
    return parseRefreshTokenTtlSeconds(value, process.env.NODE_ENV);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invalid REFRESH_TOKEN_TTL',
    });
    return z.NEVER;
  }
});

const booleanString = z.enum(['true', 'false']).transform(value => value === 'true');

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('public/uploads'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Optional but recommended
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('mtruong-store'),
  
  // Access token TTL uses jose duration syntax; refresh token TTL is integer seconds.
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: refreshTokenTtlSchema,
  
  // Upload
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  UPLOAD_MAX_FILES_PER_REQUEST: z.coerce.number().int().positive().default(5),
  UPLOAD_DAILY_FILE_LIMIT: z.coerce.number().int().positive().default(50),
  UPLOAD_DAILY_BYTE_LIMIT: z.coerce.number().int().positive().default(50 * 1024 * 1024),
  UPLOAD_REQUEST_LIMIT: z.coerce.number().int().positive().default(5),

  // Forwarded client IP headers are ignored unless a trusted proxy is configured.
  TRUST_PROXY: booleanString.default('false'),
  RATE_LIMIT_TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),
});

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
// Next imports route modules while compiling. Supply inert values only for that
// compilation phase so runtime secrets are neither required nor baked into the
// image; the real server process still validates its own environment below.
const buildEnvironment = isProductionBuild
  ? {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? 'mysql://build:build@localhost:3306/build',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'build-only-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'build-only-refresh-secret-at-least-32-characters',
      REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL ?? '604800',
    }
  : process.env;
const parsed = envSchema.safeParse(buildEnvironment);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
