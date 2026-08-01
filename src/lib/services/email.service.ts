import { logger } from '../logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // ponytail: Using a simple log for now. 
      // Upgrade path: Integrate with Nodemailer, Resend, or SendGrid.
      logger.info(`[EMAIL SENT] To: ${options.to}, Subject: ${options.subject}`);
      
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      return false;
    }
  }

  static async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    return this.sendEmail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      text: `Vui lòng sử dụng liên kết sau để đặt lại mật khẩu: ${resetUrl}`,
      html: `<p>Vui lòng sử dụng liên kết sau để đặt lại mật khẩu:</p><a href="${resetUrl}">${resetUrl}</a>`,
    });
  }
}