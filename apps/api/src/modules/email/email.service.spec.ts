import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createTransportMock = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({
  createTransport: createTransportMock,
  default: { createTransport: createTransportMock },
}));

import { EmailService } from './email.service';

const PROD_SMTP = {
  NODE_ENV: 'production',
  SMTP_HOST: 'relay.example.org',
  SMTP_PORT: '587',
  SMTP_USER: 'do-not-reply@example.org',
  SMTP_PASS: 'secret',
};

describe('EmailService', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let sendMail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    sendMail = vi.fn().mockResolvedValue({ messageId: 'abc' });
    createTransportMock.mockReset();
    createTransportMock.mockReturnValue({ sendMail });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const withEnv = (env: Record<string, string>) => {
    for (const [k, v] of Object.entries(env)) process.env[k] = v;
  };

  describe('console mode', () => {
    it('logs instead of sending when SMTP_HOST is absent, and opens no connection', async () => {
      delete process.env.SMTP_HOST;
      process.env.NODE_ENV = 'development';

      const service = new EmailService();
      const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});

      await service.sendTransactional('to@example.com', 'Subject', '<p>html</p>', 'text');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL DEV]'));
      // The absence of a transport is the point: local dev must need no credentials.
      expect(createTransportMock).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('logs for sendNotification without throwing', () => {
      delete process.env.SMTP_HOST;
      process.env.NODE_ENV = 'development';

      const service = new EmailService();
      const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});

      expect(() =>
        service.sendNotification('to@example.com', 'Subject', '<p>html</p>', 'text'),
      ).not.toThrow();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL DEV]'));
    });

    // Misconfigured production must degrade to logging rather than crash-looping the api:
    // no email is bad, an api that will not boot is worse.
    it('falls back to console in production when SMTP_HOST is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SMTP_HOST;

      const service = new EmailService();

      expect(service['isDev']).toBe(true);
      expect(createTransportMock).not.toHaveBeenCalled();
    });
  });

  describe('SMTP mode', () => {
    it('sends over SMTP and awaits the result', async () => {
      withEnv(PROD_SMTP);

      const service = new EmailService();
      await service.sendTransactional('to@example.com', 'Subject', '<p>html</p>', 'text');

      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'to@example.com' }));
    });

    // The trap this guards: `secure: true` selects implicit TLS on 465 and fails the handshake
    // against a 587 submission port with an error that never names the cause.
    it('uses STARTTLS (not implicit TLS) on the submission port', () => {
      withEnv(PROD_SMTP);

      new EmailService();

      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587, secure: false, requireTLS: true }),
      );
    });

    it('uses implicit TLS when SMTP_SECURE is true', () => {
      withEnv({ ...PROD_SMTP, SMTP_PORT: '465', SMTP_SECURE: 'true' });

      new EmailService();

      expect(createTransportMock).toHaveBeenCalledWith(
        expect.objectContaining({ port: 465, secure: true, requireTLS: false }),
      );
    });

    it('propagates transactional failure — a verification email that never sent is not a success', async () => {
      withEnv(PROD_SMTP);
      sendMail.mockRejectedValueOnce(new Error('relay rejected'));

      const service = new EmailService();

      await expect(
        service.sendTransactional('to@example.com', 'Subject', '<p>h</p>', 't'),
      ).rejects.toThrow('relay rejected');
    });

    it('swallows and logs notification failure so the triggering action is undisturbed', async () => {
      withEnv(PROD_SMTP);
      sendMail.mockRejectedValueOnce(new Error('relay rejected'));

      const service = new EmailService();
      const warnSpy = vi.spyOn(service['logger'], 'warn').mockImplementation(() => {});

      expect(() =>
        service.sendNotification('to@example.com', 'Subject', '<p>h</p>', 't'),
      ).not.toThrow();

      await vi.waitFor(() =>
        expect(warnSpy).toHaveBeenCalledWith(
          expect.objectContaining({ msg: 'Notification email failed' }),
        ),
      );
    });

    it('sends from the configured identity', async () => {
      withEnv({ ...PROD_SMTP, EMAIL_FROM: 'Veervrat <do-not-reply@example.org>' });

      const service = new EmailService();
      await service.sendTransactional('to@example.com', 'Subject', '<p>h</p>', 't');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'Veervrat <do-not-reply@example.org>' }),
      );
    });
  });
});
