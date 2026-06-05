import * as React from 'react';

type Props = {
  vmDisplayName: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'Your Vratmitra invitation has been accepted',
    body: (name: string) => `${name} has accepted your invitation and is now your Vratmitra on Veervrat. You can connect with them from your My Vratmitras page.`,
  },
  MR: {
    subject: 'तुमचे व्रतमित्र आमंत्रण स्वीकारले गेले',
    body: (name: string) => `${name} यांनी तुमचे आमंत्रण स्वीकारले आहे आणि आता ते Veervrat वर तुमचे व्रतमित्र आहेत.`,
  },
};

export function VmInvitationAcceptedEmail({ vmDisplayName, language }: Props): React.ReactElement {
  const t = copy[language];
  return (
    <html>
      <head><meta charSet="utf-8" /><title>{t.subject}</title></head>
      <body style={{ fontFamily: 'sans-serif', color: '#1a1a1a', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Veervrat</p>
        <p>{t.body(vmDisplayName)}</p>
        <hr style={{ borderTop: '1px solid #eee', margin: '24px 0' }} />
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
