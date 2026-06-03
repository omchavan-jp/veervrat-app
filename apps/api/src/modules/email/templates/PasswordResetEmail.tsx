import * as React from 'react';

type Props = {
  displayName: string;
  resetUrl: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'Reset your Veervrat password',
    greeting: (name: string) => `Hello ${name},`,
    body: 'We received a request to reset your Veervrat password. Click the link below to choose a new password.',
    cta: 'Reset Password',
    expiry: 'This link expires in 1 hour.',
    ignore: 'If you did not request a password reset, you can safely ignore this email. Your password will not change.',
  },
  MR: {
    subject: 'तुमचा Veervrat पासवर्ड रीसेट करा',
    greeting: (name: string) => `नमस्कार ${name},`,
    body: 'आम्हाला तुमचा Veervrat पासवर्ड रीसेट करण्याची विनंती मिळाली. नवीन पासवर्ड निवडण्यासाठी खालील लिंकवर क्लिक करा.',
    cta: 'पासवर्ड रीसेट करा',
    expiry: 'ही लिंक 1 तासानंतर कालबाह्य होते.',
    ignore: 'जर तुम्ही पासवर्ड रीसेटची विनंती केली नसेल, तर हा ईमेल दुर्लक्षित करा. तुमचा पासवर्ड बदलणार नाही.',
  },
};

export function PasswordResetEmail({ displayName, resetUrl, language }: Props): React.ReactElement {
  const t = copy[language];

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{t.subject}</title>
      </head>
      <body style={{ fontFamily: 'sans-serif', color: '#1a1a1a', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Veervrat</p>
        <p>{t.greeting(displayName)}</p>
        <p>{t.body}</p>
        <p style={{ margin: '24px 0' }}>
          <a
            href={resetUrl}
            style={{
              backgroundColor: '#2f5b4f',
              color: '#ffffff',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '6px',
              display: 'inline-block',
            }}
          >
            {t.cta}
          </a>
        </p>
        <p style={{ fontSize: '13px', color: '#666' }}>{t.expiry}</p>
        <p style={{ fontSize: '13px', color: '#666' }}>{t.ignore}</p>
        <hr style={{ borderTop: '1px solid #eee', margin: '24px 0' }} />
        <p style={{ fontSize: '12px', color: '#999' }}>
          {resetUrl}
        </p>
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
