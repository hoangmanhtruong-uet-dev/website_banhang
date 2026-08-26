import net from 'node:net';
import { env } from '@/config/env';

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  let candidate = value.trim();
  if (!candidate || candidate.length > 64 || /[\r\n\0]/.test(candidate)) return null;

  if (candidate.startsWith('[')) {
    const closingBracket = candidate.indexOf(']');
    if (closingBracket < 0) return null;
    candidate = candidate.slice(1, closingBracket);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(':'));
  }

  const mappedIpv4 = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  if (mappedIpv4 && net.isIP(mappedIpv4) === 4) return mappedIpv4;
  return net.isIP(candidate) ? candidate.toLowerCase() : null;
}

/**
 * Forwarded headers are attacker-controlled unless the deployment explicitly
 * trusts a fixed number of reverse-proxy hops. Web Request does not expose a
 * portable socket address, so untrusted deployments intentionally share the
 * conservative `direct-client` bucket.
 */
export function getTrustedClientIp(request: Request): string | undefined {
  if (!env.TRUST_PROXY) return undefined;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    const index = chain.length - env.RATE_LIMIT_TRUST_PROXY_HOPS;
    const candidate = index >= 0 ? normalizeIp(chain[index]) : null;
    if (candidate) return candidate;
  }

  return normalizeIp(request.headers.get('x-real-ip')) ?? undefined;
}

export function getRateLimitClientIp(request: Request): string {
  return getTrustedClientIp(request) ?? (env.TRUST_PROXY ? 'unknown-client' : 'direct-client');
}

export function getRateLimitIdentity(request: Request, operation: string, userId?: string): string {
  const ip = getRateLimitClientIp(request);
  return userId
    ? `${operation}:user:${userId}:ip:${ip}`
    : `${operation}:ip:${ip}`;
}
