import { NextResponse } from 'next/server';
import { parseAllowedOrigins, type OriginPolicyEnvironment } from '@/lib/security/origin-policy';

export interface CorsOptions {
  methods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-webhook-signature', 'x-webhook-timestamp'],
  maxAge: 86400,
  credentials: true,
};

/**
 * Validates request origin against configured allowed origins and returns CORS headers.
 * Returns null if origin is missing or untrusted.
 */
export function getCorsHeaders(
  originHeader: string | null,
  environment: OriginPolicyEnvironment = process.env,
  options: CorsOptions = DEFAULT_CORS_OPTIONS,
): Record<string, string> | null {
  if (!originHeader) return null;

  const parsed = parseAllowedOrigins(environment);
  if (!parsed.ok || parsed.origins.size === 0) return null;

  let requestOrigin: string;
  try {
    const url = new URL(originHeader.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    requestOrigin = url.origin;
  } catch {
    return null;
  }

  if (!parsed.origins.has(requestOrigin)) {
    return null;
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': requestOrigin,
    'Vary': 'Origin',
  };

  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (options.methods && options.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = options.methods.join(', ');
  }

  if (options.allowedHeaders && options.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ');
  }

  if (options.maxAge) {
    headers['Access-Control-Max-Age'] = options.maxAge.toString();
  }

  return headers;
}

/**
 * Handles CORS Preflight (OPTIONS) requests safely.
 */
export function handleCorsPreflight(
  request: Request,
  environment: OriginPolicyEnvironment = process.env,
  options: CorsOptions = DEFAULT_CORS_OPTIONS,
): NextResponse | null {
  if (request.method.toUpperCase() !== 'OPTIONS') return null;

  const originHeader = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(originHeader, environment, options);

  if (!corsHeaders) {
    return NextResponse.json({ error: 'CORS Preflight Rejected' }, { status: 403 });
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
