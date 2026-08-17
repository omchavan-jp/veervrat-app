import { Injectable, Logger } from '@nestjs/common';
import { render } from '@react-email/render';
import { createTransport, type Transporter } from 'nodemailer';
import type { ReactElement } from 'react';

/**
 * Transactional and notification email over JP IT's SMTP relay (decision D9 — this replaced
 * Resend once the relay was available, removing an external account and its 3,000/month cap,
 * which was user-facing because exhausting it breaks signup verification).
 *
 * Only the transport is SMTP-specific. Templates render to HTML + text upstream of this, so
 * swapping providers again stays a one-file change.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly isDev: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    // Absence of a host — not of a password — is what selects console mode, so local
    // development needs no credentials at all.
    this.isDev = process.env.NODE_ENV !== 'production' || !host;
    this.from =
      process.env.EMAIL_FROM ??
      'Veervrat <do-not-reply-veervrat@notifications.jnanaprabodhini.org>';

    if (process.env.NODE_ENV === 'production' && !host) {
      this.logger.warn('SMTP_HOST is not set in production — emails will log to console only');
    }

    this.transporter = this.isDev
      ? null
      : createTransport({
          host,
          port: Number(process.env.SMTP_PORT ?? 587),
          // ⚠️ `secure` selects IMPLICIT TLS (port 465). On the submission port (587) the
          // connection opens in the clear and upgrades via STARTTLS, so this must be false and
          // `requireTLS` true. Setting `secure: true` against 587 fails the handshake with an
          // error that never names the cause — the most likely way to misconfigure this.
          secure: process.env.SMTP_SECURE === 'true',
          requireTLS: process.env.SMTP_SECURE !== 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
  }

  /**
   * Awaits delivery and lets failure propagate: a verification email that never sent must not
   * look like a successful registration, since the account cannot be logged into without it.
   */
  async sendTransactional(to: string, subject: string, html: string, text: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}\n${text}`);
      return;
    }
    await this.transporter!.sendMail({ from: this.from, to, subject, html, text });
  }

  /** Fire-and-forget: a failed notification must not disturb the action that triggered it. */
  sendNotification(to: string, subject: string, html: string, text: string): void {
    if (this.isDev) {
      this.logger.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}\n${text}`);
      return;
    }
    this.transporter!.sendMail({ from: this.from, to, subject, html, text }).catch((err: Error) => {
      this.logger.warn({ msg: 'Notification email failed', error: err.message, to, subject });
    });
  }

  async renderTemplate(component: ReactElement): Promise<{ html: string; text: string }> {
    const html = await render(component);
    const text = await render(component, { plainText: true });
    return { html, text };
  }
}
