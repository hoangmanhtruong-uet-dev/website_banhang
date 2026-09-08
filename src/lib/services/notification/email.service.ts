import { createHash } from 'node:crypto';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { createNotificationProvider, type NotificationProvider } from './notification-provider';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function recipientHash(recipient: string): string {
  return createHash('sha256').update(recipient).digest('hex').slice(0, 12);
}

export class EmailService {
  static provider: NotificationProvider = createNotificationProvider();

  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.provider.send({
        channel: 'email',
        recipient: options.to,
        template: 'generic-email',
        idempotencyKey: createHash('sha256').update(`generic-email:${options.to}:${options.subject}:${options.text}`).digest('hex'),
        data: {
          subject: options.subject,
          text: options.text,
          ...(options.html ? { html: options.html } : {}),
        },
      });
      logger.info('email.accepted', { recipientHash: recipientHash(options.to), template: 'generic-email' });
      return true;
    } catch (error) {
      logger.error('email.provider_failed', error, { recipientHash: recipientHash(options.to), template: 'generic-email' });
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.provider.send({
        channel: 'email',
        recipient: email,
        template: 'password-reset',
        idempotencyKey: createHash('sha256').update(`password-reset:${email}:${token}`).digest('hex'),
        data: { resetUrl },
      });
      logger.info('password_reset_email.accepted', { recipientHash: recipientHash(email), template: 'password-reset' });
      return true;
    } catch (error) {
      logger.error('password_reset_email.provider_failed', error, { recipientHash: recipientHash(email), template: 'password-reset' });
      return false;
    }
  }
}