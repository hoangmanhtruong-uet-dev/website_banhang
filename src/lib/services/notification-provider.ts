import { createHash } from 'node:crypto';
import { logger } from '@/lib/logger';

export type NotificationChannel = 'email' | 'sms';

export interface NotificationInput {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  idempotencyKey: string;
  data: Readonly<Record<string, string>>;
}

export interface NotificationResult { messageId: string }

export interface NotificationProvider {
  /** The adapter must pass idempotencyKey to the provider and the provider must honor it. */
  send(input: NotificationInput): Promise<NotificationResult>;
}

function recipientHash(recipient: string): string {
  return createHash('sha256').update(recipient).digest('hex').slice(0, 12);
}

export class LogNotificationProvider implements NotificationProvider {
  async send(input: NotificationInput): Promise<NotificationResult> {
    const messageId = `log_${createHash('sha256').update(input.idempotencyKey).digest('hex').slice(0, 24)}`;
    logger.info('notification.provider.accepted', {
      messageId,
      channel: input.channel,
      recipientHash: recipientHash(input.recipient),
      template: input.template,
    });
    return { messageId };
  }
}

/**
 * Provider webhook chung cho email/SMS. Endpoint nhận JSON và phải trả 2xx.
 * Idempotency-Key được gửi kèm để provider không phát trùng khi outbox retry.
 */
export class WebhookNotificationProvider implements NotificationProvider {
  constructor(
    private readonly endpoints: Readonly<Partial<Record<NotificationChannel, string>>>,
    private readonly token?: string,
  ) {}

  async send(input: NotificationInput): Promise<NotificationResult> {
    const endpoint = this.endpoints[input.channel];
    if (!endpoint) throw new Error(`Notification webhook for ${input.channel} is not configured`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': input.idempotencyKey,
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({
        channel: input.channel,
        to: input.recipient,
        template: input.template,
        variables: input.data,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Notification provider returned HTTP ${response.status}`);
    const body = await response.json().catch(() => ({})) as { messageId?: unknown; id?: unknown };
    const providerId = typeof body.messageId === 'string' ? body.messageId : typeof body.id === 'string' ? body.id : null;
    return {
      messageId: providerId ?? `webhook_${createHash('sha256').update(input.idempotencyKey).digest('hex').slice(0, 24)}`,
    };
  }
}

export function createNotificationProvider(): NotificationProvider {
  if (process.env.NOTIFICATION_PROVIDER !== 'webhook') return new LogNotificationProvider();
  const email = process.env.NOTIFICATION_EMAIL_WEBHOOK_URL?.trim();
  const sms = process.env.NOTIFICATION_SMS_WEBHOOK_URL?.trim();
  const allowedHosts = new Set((process.env.NOTIFICATION_ALLOWED_HOSTS ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  if ((!email && !sms) || allowedHosts.size === 0) throw new Error('Webhook notification requires endpoint(s) and NOTIFICATION_ALLOWED_HOSTS');
  for (const endpoint of [email, sms].filter((item): item is string => Boolean(item))) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) throw new Error('Notification endpoint must use HTTPS and an allowed hostname');
  }
  return new WebhookNotificationProvider(
    { ...(email ? { email } : {}), ...(sms ? { sms } : {}) },
    process.env.NOTIFICATION_WEBHOOK_TOKEN?.trim(),
  );
}
