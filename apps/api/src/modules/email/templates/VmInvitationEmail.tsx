import * as React from 'react';

type Props = {
  vaDisplayName: string;
  scope: 'global' | 'journey';
  acceptUrl: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'You have been invited to be a Vratmitra on Veervrat',
    greeting: (name: string) => `Hello,`,
    body: (name: string, scope: string) =>
      `${name} has invited you to be their ${scope === 'global' ? 'Vratmitra (mentor)' : 'journey Vratmitra'} on Veervrat. As a Vratmitra, you will guide and support them on their journey of self-reliance and personal growth.`,
    cta: 'Accept Invitation',
    expiry: 'This invitation expires in 7 days.',
    ignore: 'If you do not wish to accept, you can safely ignore this email.',
  },
  MR: {
    subject: 'तुम्हाला Veervrat वर व्रतमित्र म्हणून आमंत्रित केले आहे',
    greeting: (name: string) => `नमस्कार,`,
    body: (name: string, scope: string) =>
      `${name} यांनी तुम्हाला Veervrat वर त्यांचे ${scope === 'global' ? 'व्रतमित्र' : 'प्रवास व्रतमित्र'} म्हणून आमंत्रित केले आहे.`,
    cta: 'आमंत्रण स्वीकारा',
    expiry: 'हे आमंत्रण 7 दिवसांनंतर कालबाह्य होते.',
    ignore: 'जर तुम्हाला स्वीकारायचे नसेल तर हा ईमेल दुर्लक्षित करा.',
  },
};

export function VmInvitationEmail({ vaDisplayName, scope, acceptUrl, language }: Props): React.ReactElement {
  const t = copy[language];
  return (
    <html>
      <head><meta charSet="utf-8" /><title>{t.subject}</title></head>
      <body style={{ fontFamily: 'sans-serif', color: '#1a1a1a', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Veervrat</p>
        <p>{t.greeting(vaDisplayName)}</p>
        <p>{t.body(vaDisplayName, scope)}</p>
        <p style={{ margin: '24px 0' }}>
          <a href={acceptUrl} style={{ backgroundColor: '#2f5b4f', color: '#ffffff', padding: '12px 24px', textDecoration: 'none', borderRadius: '6px', display: 'inline-block' }}>
            {t.cta}
          </a>
        </p>
        <p style={{ fontSize: '13px', color: '#666' }}>{t.expiry}</p>
        <p style={{ fontSize: '13px', color: '#666' }}>{t.ignore}</p>
        <hr style={{ borderTop: '1px solid #eee', margin: '24px 0' }} />
        <p style={{ fontSize: '12px', color: '#999' }}>{acceptUrl}</p>
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
