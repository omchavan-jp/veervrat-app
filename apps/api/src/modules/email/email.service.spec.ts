import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('dev mode (no RESEND_API_KEY)', () => {
    it('logs to console and does not call Resend for sendTransactional', async () => {
      delete process.env.RESEND_API_KEY;
      process.env.NODE_ENV = 'development';

      const service = new EmailService();
      const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});

      await service.sendTransactional('to@example.com', 'Subject', '<p>html</p>', 'text');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL DEV]'));
    });

    it('logs to console for sendNotification without throwing', () => {
      delete process.env.RESEND_API_KEY;
      process.env.NODE_ENV = 'development';

      const service = new EmailService();
      const logSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => {});

      expect(() =>
        service.sendNotification('to@example.com', 'Subject', '<p>html</p>', 'text'),
      ).not.toThrow();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL DEV]'));
    });
  });

  describe('prod mode (with RESEND_API_KEY)', () => {
    it('calls Resend SDK send for sendTransactional', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_test_key';

      const mockSend = vi.fn().mockResolvedValue({ id: 'email-id' });
      const service = new EmailService();
      service['resend'] = { emails: { send: mockSend } } as unknown as (typeof service)['resend'];
      service['isDev'] = false;

      await service.sendTransactional('to@example.com', 'Subject', '<p>html</p>', 'text');

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'to@example.com' }));
    });
  });
});
