import * as React from 'react';

type Props = {
  inviterDisplayName: string;
  signupUrl: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'You have been invited to join Veervrat',
    greeting: 'Hello,',
    body: (name: string) =>
      `${name} has invited you to join Veervrat — a companion for self-reliance and personal growth. Create your account to get started.`,
    cta: 'Join Veervrat',
    expiry: 'This invitation expires in 30 days.',
    ignore: 'If you did not expect this, you can safely ignore this email.',
  },
  MR: {
    subject: 'तुम्हाला Veervrat मध्ये सामील होण्यासाठी आमंत्रित केले आहे',
    greeting: 'नमस्कार,',
    body: (name: string) =>
      `${name} यांनी तुम्हाला Veervrat मध्ये सामील होण्यासाठी आमंत्रित केले आहे — आत्मनिर्भरता आणि व्यक्तिमत्त्व विकासासाठीचा सोबती. सुरुवात करण्यासाठी तुमचे खाते तयार करा.`,
    cta: 'Veervrat मध्ये सामील व्हा',
    expiry: 'हे आमंत्रण 30 दिवसांनंतर कालबाह्य होते.',
    ignore: 'जर तुम्हाला याची अपेक्षा नव्हती, तर हा ईमेल दुर्लक्षित करा.',
  },
};

export function PlatformInvitationEmail({
  inviterDisplayName,
  signupUrl,
  language,
}: Props): React.ReactElement {
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
        <p>{t.greeting}</p>
        <p>{t.body(inviterDisplayName)}</p>
        <p style={{ margin: '24px 0' }}>
          <a
            href={signupUrl}
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
        <p style={{ fontSize: '12px', color: '#999' }}>{signupUrl}</p>
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
