import { createHash } from 'node:crypto';
import { logger } from '@/lib/logger';

export interface NotificationInput {
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

export class LogNotificationProvider implements NotificationProvider {
  async send(input: NotificationInput): Promise<NotificationResult> {
    const messageId = `log_${createHash('sha256').update(input.idempotencyKey).digest('hex').slice(0, 24)}`;
    logger.info('notification.provider.accepted', {
      messageId,
      recipientHash: createHash('sha256').update(input.recipient).digest('hex').slice(0, 12),
      template: input.template,
    });
    return { messageId };
  }
}
