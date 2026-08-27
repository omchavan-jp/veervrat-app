import * as React from 'react';

type Props = {
  displayName: string;
  downloadUrl: string;
  language: 'EN' | 'MR';
};

const copy = {
  EN: {
    subject: 'Your Veervrat data export is ready',
    greeting: (name: string) => `Hello ${name},`,
    body: 'You requested an export of your data. Click the link below to download it as a JSON file.',
    cta: 'Download My Data',
    expiry: 'This link expires in 24 hours. You can request a new one from Settings at any time.',
    security:
      'If you did not request this, someone with access to your account may have. Consider changing your password.',
  },
  MR: {
    subject: 'तुमचा Veervrat डेटा एक्सपोर्ट तयार आहे',
    greeting: (name: string) => `नमस्कार ${name},`,
    body: 'तुम्ही तुमच्या डेटाचा एक्सपोर्ट मागवला. JSON फाइल म्हणून डाउनलोड करण्यासाठी खालील लिंकवर क्लिक करा.',
    cta: 'माझा डेटा डाउनलोड करा',
    expiry: 'ही लिंक 24 तासांनंतर कालबाह्य होते. तुम्ही सेटिंग्जमधून कधीही नवीन मागवू शकता.',
    security:
      'तुम्ही ही विनंती केली नसेल, तर तुमच्या खात्याचा प्रवेश कोणाकडे असू शकतो. पासवर्ड बदलण्याचा विचार करा.',
  },
};

export function DataExportEmail({ displayName, downloadUrl, language }: Props): React.ReactElement {
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
            href={downloadUrl}
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
        <p style={{ fontSize: '13px', color: '#666' }}>{t.security}</p>
        <hr style={{ borderTop: '1px solid #eee', margin: '24px 0' }} />
        <p style={{ fontSize: '12px', color: '#999' }}>{downloadUrl}</p>
      </body>
    </html>
  );
}

export function getSubject(language: 'EN' | 'MR'): string {
  return copy[language].subject;
}
