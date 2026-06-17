import * as React from 'react';

type Props = {
  displayName: string;
  confirmUrl: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'Confirm your new Veervrat email',
    greeting: (name: string) => `Hello ${name},`,
    body: 'We received a request to change the email address on your Veervrat account to this one. Click below to confirm.',
    cta: 'Confirm Email Change',
    expiry: 'This link expires in 1 hour.',
    ignore: 'If you did not request this change, you can safely ignore this email. Your account email will not change.',
  },
  MR: {
    subject: 'तुमचा नवीन Veervrat ईमेल निश्चित करा',
    greeting: (name: string) => `नमस्कार ${name},`,
    body: 'आम्हाला तुमच्या Veervrat खात्याचा ईमेल पत्ता यावर बदलण्याची विनंती मिळाली. निश्चित करण्यासाठी खाली क्लिक करा.',
    cta: 'ईमेल बदल निश्चित करा',
    expiry: 'ही लिंक 1 तासानंतर कालबाह्य होते.',
    ignore: 'जर तुम्ही हा बदल विनंती केला नसेल, तर हा ईमेल दुर्लक्षित करा. तुमच्या खात्याचा ईमेल बदलणार नाही.',
  },
};

export function EmailChangeEmail({ displayName, confirmUrl, language }: Props): React.ReactElement {
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
            href={confirmUrl}
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
        <p style={{ fontSize: '12px', color: '#999' }}>{confirmUrl}</p>
      </body>
    </html>
  );
}

export function getEmailChangeSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
