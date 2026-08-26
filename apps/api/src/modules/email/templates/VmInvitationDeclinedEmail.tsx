import * as React from 'react';

type Props = {
  vaDisplayName: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'Your Vratmitra invitation was declined',
    body: () =>
      `The person you invited has declined your Vratmitra invitation. You can send a new invitation to someone else from your My Vratmitras page.`,
  },
  MR: {
    subject: 'तुमचे व्रतमित्र आमंत्रण नाकारले गेले',
    body: () => `तुम्ही आमंत्रित केलेल्या व्यक्तीने तुमचे व्रतमित्र आमंत्रण नाकारले आहे.`,
  },
};

export function VmInvitationDeclinedEmail({ vaDisplayName, language }: Props): React.ReactElement {
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
        <p>{t.body()}</p>
        <hr style={{ borderTop: '1px solid #eee', margin: '24px 0' }} />
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
