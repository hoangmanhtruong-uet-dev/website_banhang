import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthenticationError } from '@/lib/errors';

export interface HeadersLike {
  get(name: string): string | null;
}

export interface WebhookVerificationInput {
  rawBody: string;
  headers: HeadersLike;
  provider?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  timestamp?: number;
}

export interface WebhookVerifier {
  verify(input: WebhookVerificationInput): WebhookVerificationResult;
}

export class StandardHmacWebhookVerifier implements WebhookVerifier {
  verify(input: WebhookVerificationInput): WebhookVerificationResult {
    const signatureHeader = input.headers.get('x-webhook-signature');
    const timestampHeader = input.headers.get('x-webhook-timestamp');

    if (!timestampHeader || !/^\d{10}$/.test(timestampHeader)) {
      return { valid: false, reason: 'Invalid or missing webhook timestamp' };
    }

    const timestamp = Number(timestampHeader);
    const configuredTolerance = Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
    const tolerance = Number.isFinite(configuredTolerance) && configuredTolerance > 0
      ? Math.min(configuredTolerance, 3600)
      : 300;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      return { valid: false, reason: 'Webhook timestamp is outside the allowed tolerance' };
    }

    if (!signatureHeader || !/^[a-f0-9]{64}$/i.test(signatureHeader)) {
      return { valid: false, reason: 'Invalid or missing webhook signature' };
    }

    const secret = resolveWebhookSecret(input.provider);
    if (!secret || secret.length < 32) {
      return { valid: false, reason: 'Webhook authentication is not configured' };
    }

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${input.rawBody}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(signatureHeader, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, reason: 'Invalid webhook signature' };
    }

    const isMatch = timingSafeEqual(expectedBuffer, actualBuffer);
    if (!isMatch) {
      return { valid: false, reason: 'Invalid webhook signature' };
    }

    return { valid: true, timestamp };
  }
}

export function resolveWebhookSecret(provider?: string): string | undefined {
  if (provider) {
    const sanitizedProvider = provider.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const providerSpecificSecret = process.env[`WEBHOOK_SECRET_${sanitizedProvider}`];
    if (providerSpecificSecret && providerSpecificSecret.length >= 32) {
      return providerSpecificSecret;
    }
  }
  return process.env.WEBHOOK_SECRET;
}

const defaultVerifier = new StandardHmacWebhookVerifier();

export function verifyWebhookSignature(input: WebhookVerificationInput, verifier: WebhookVerifier = defaultVerifier): number {
  const result = verifier.verify(input);
  if (!result.valid) {
    throw new AuthenticationError(result.reason || 'Invalid webhook authentication');
  }
  return result.timestamp ?? Math.floor(Date.now() / 1000);
}
