import { Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null;
  private readonly from: string;
  private isDev: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.isDev = process.env.NODE_ENV !== 'production' || !apiKey;
    this.from = process.env.EMAIL_FROM ?? 'Veervrat <noreply@veervrat.com>';
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (process.env.NODE_ENV === 'production' && !apiKey) {
      this.logger.warn('RESEND_API_KEY is not set in production — emails will log to console only');
    }
  }

  async sendTransactional(to: string, subject: string, html: string, text: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}\n${text}`);
      return;
    }
    await this.resend!.emails.send({ from: this.from, to, subject, html, text });
  }

  sendNotification(to: string, subject: string, html: string, text: string): void {
    if (this.isDev) {
      this.logger.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}\n${text}`);
      return;
    }
    this.resend!.emails.send({ from: this.from, to, subject, html, text }).catch((err: Error) => {
      this.logger.warn({ msg: 'Notification email failed', error: err.message, to, subject });
    });
  }

  async renderTemplate(component: ReactElement): Promise<{ html: string; text: string }> {
    const html = await render(component);
    const text = await render(component, { plainText: true });
    return { html, text };
  }
}
