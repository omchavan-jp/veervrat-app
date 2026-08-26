import * as React from 'react';

type Props = {
  displayName: string;
  verifyUrl: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'Verify your Veervrat account',
    greeting: (name: string) => `Hello ${name},`,
    body: 'Thank you for creating your Veervrat account. Please verify your email address by clicking the link below.',
    cta: 'Verify Email',
    expiry: 'This link expires in 24 hours.',
    ignore: 'If you did not create this account, you can safely ignore this email.',
  },
  MR: {
    subject: 'तुमचे Veervrat खाते सत्यापित करा',
    greeting: (name: string) => `नमस्कार ${name},`,
    body: 'तुमचे Veervrat खाते तयार केल्याबद्दल धन्यवाद. कृपया खालील लिंकवर क्लिक करून तुमचा ईमेल पत्ता सत्यापित करा.',
    cta: 'ईमेल सत्यापित करा',
    expiry: 'ही लिंक 24 तासांनंतर कालबाह्य होते.',
    ignore: 'जर तुम्ही हे खाते तयार केले नसेल, तर हा ईमेल दुर्लक्षित करा.',
  },
};

export function VerifyEmailEmail({ displayName, verifyUrl, language }: Props): React.ReactElement {
  const t = copy[language];

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{t.subject}</title>
      </head>
      <body
        style={{
          fontFamily: 'sans-serif',
          color: '#1a1a1a',
          padding: '24px',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Veervrat</p>
        <p>{t.greeting(displayName)}</p>
        <p>{t.body}</p>
        <p style={{ margin: '24px 0' }}>
          <a
            href={verifyUrl}
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
        <p style={{ fontSize: '12px', color: '#999' }}>{verifyUrl}</p>
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
