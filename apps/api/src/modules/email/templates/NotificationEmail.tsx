import * as React from 'react';
import type { EmailableEvent } from '../../users/notification-prefs';

type Lang = 'EN' | 'MR';

type Props = {
  event: EmailableEvent;
  language: Lang;
  // Absolute URL to the relevant entity (or the notifications panel as a fallback).
  link: string;
};

type Copy = { subject: string; body: string; cta: string };

// Per-event subject + body + CTA label, bilingual. Covers exactly the ✅ rows in spec/25
// (the EMAILABLE_EVENTS allowlist). In-app-only events never reach this template.
const COPY: Record<EmailableEvent, Record<Lang, Copy>> = {
  VM_INVITATION_RECEIVED: {
    EN: { subject: 'You have a new Vratmitra invitation', body: 'Someone has invited you to be their Vratmitra on Veervrat.', cta: 'View invitation' },
    MR: { subject: 'तुम्हाला नवीन व्रतमित्र आमंत्रण आहे', body: 'कोणीतरी तुम्हाला Veervrat वर त्यांचे व्रतमित्र होण्यासाठी आमंत्रित केले आहे.', cta: 'आमंत्रण पहा' },
  },
  VM_INVITATION_ACCEPTED: {
    EN: { subject: 'Your Vratmitra invitation was accepted', body: 'Your Vratmitra invitation has been accepted.', cta: 'View details' },
    MR: { subject: 'तुमचे व्रतमित्र आमंत्रण स्वीकारले गेले', body: 'तुमचे व्रतमित्र आमंत्रण स्वीकारले गेले आहे.', cta: 'तपशील पहा' },
  },
  VM_INVITATION_DECLINED: {
    EN: { subject: 'Your Vratmitra invitation was declined', body: 'Your Vratmitra invitation was declined.', cta: 'View details' },
    MR: { subject: 'तुमचे व्रतमित्र आमंत्रण नाकारले गेले', body: 'तुमचे व्रतमित्र आमंत्रण नाकारले गेले.', cta: 'तपशील पहा' },
  },
  VM_INVITATION_EXPIRED: {
    EN: { subject: 'A Vratmitra invitation expired', body: 'A Vratmitra invitation you sent has expired.', cta: 'View invitations' },
    MR: { subject: 'व्रतमित्र आमंत्रण कालबाह्य झाले', body: 'तुम्ही पाठवलेले व्रतमित्र आमंत्रण कालबाह्य झाले आहे.', cta: 'आमंत्रणे पहा' },
  },
  INVITEE_JOINED_PLATFORM: {
    EN: { subject: 'Someone you invited joined Veervrat', body: 'A person you invited has joined the platform. You can now invite them as your Vratmitra.', cta: 'View' },
    MR: { subject: 'तुम्ही आमंत्रित केलेली व्यक्ती Veervrat वर सामील झाली', body: 'तुम्ही आमंत्रित केलेली व्यक्ती प्लॅटफॉर्मवर सामील झाली आहे.', cta: 'पहा' },
  },
  JOURNEY_DORMANT: {
    EN: { subject: 'A journey has gone dormant', body: 'A journey has had no activity for 30 days and is now dormant. You can resume it any time.', cta: 'Resume journey' },
    MR: { subject: 'एक प्रवास निष्क्रिय झाला आहे', body: 'एका प्रवासात ३० दिवस कोणतीही हालचाल नाही आणि तो आता निष्क्रिय आहे. तुम्ही तो कधीही पुन्हा सुरू करू शकता.', cta: 'प्रवास पुन्हा सुरू करा' },
  },
  ERC_CLOSURE_SUBMITTED: {
    EN: { subject: 'An item was submitted for your approval', body: 'Your Vratarthi has submitted an item for your review.', cta: 'Review item' },
    MR: { subject: 'तुमच्या मंजुरीसाठी एक बाब सादर केली आहे', body: 'तुमच्या व्रतार्थीने तुमच्या पुनरावलोकनासाठी एक बाब सादर केली आहे.', cta: 'बाब पुनरावलोकन करा' },
  },
  ERC_CLOSURE_APPROVED: {
    EN: { subject: 'Your item was approved', body: 'Your Vratmitra has approved your submitted item.', cta: 'View' },
    MR: { subject: 'तुमची बाब मंजूर झाली', body: 'तुमच्या व्रतमित्राने तुमची सादर केलेली बाब मंजूर केली आहे.', cta: 'पहा' },
  },
  ERC_RETURNED_FOR_REVISIT: {
    EN: { subject: 'An item was returned for revision', body: 'Your Vratmitra has returned an item for you to revise and resubmit.', cta: 'Revise item' },
    MR: { subject: 'एक बाब पुनरावृत्तीसाठी परत केली', body: 'तुमच्या व्रतमित्राने एक बाब पुनरावृत्ती करण्यासाठी परत केली आहे.', cta: 'बाब सुधारा' },
  },
  JOURNEY_COMPLETION_SUBMITTED: {
    EN: { subject: 'A journey completion needs your approval', body: 'Your Vratarthi has submitted a journey for completion approval.', cta: 'Review completion' },
    MR: { subject: 'प्रवास पूर्णतेसाठी तुमची मंजुरी आवश्यक', body: 'तुमच्या व्रतार्थीने पूर्णतेच्या मंजुरीसाठी प्रवास सादर केला आहे.', cta: 'पूर्णता पुनरावलोकन करा' },
  },
  JOURNEY_COMPLETION_APPROVED: {
    EN: { subject: 'Your journey completion was approved', body: 'Your Vratmitra has approved your journey completion. Congratulations!', cta: 'View journey' },
    MR: { subject: 'तुमची प्रवास पूर्णता मंजूर झाली', body: 'तुमच्या व्रतमित्राने तुमची प्रवास पूर्णता मंजूर केली आहे. अभिनंदन!', cta: 'प्रवास पहा' },
  },
  CUSTOM_ERC_REVIEW_REQUESTED: {
    EN: { subject: 'A custom item needs moderator review', body: 'A custom item has been submitted for global review.', cta: 'Review item' },
    MR: { subject: 'सानुकूल बाबीला नियंत्रक पुनरावलोकन आवश्यक', body: 'जागतिक पुनरावलोकनासाठी एक सानुकूल बाब सादर केली आहे.', cta: 'बाब पुनरावलोकन करा' },
  },
  CUSTOM_ERC_APPROVED: {
    EN: { subject: 'Your custom item was approved', body: 'A moderator has approved your custom item.', cta: 'View' },
    MR: { subject: 'तुमची सानुकूल बाब मंजूर झाली', body: 'नियंत्रकाने तुमची सानुकूल बाब मंजूर केली आहे.', cta: 'पहा' },
  },
  CUSTOM_ERC_REJECTED: {
    EN: { subject: 'Your custom item was not approved', body: 'A moderator has reviewed your custom item and it was not approved.', cta: 'View' },
    MR: { subject: 'तुमची सानुकूल बाब मंजूर झाली नाही', body: 'नियंत्रकाने तुमच्या सानुकूल बाबीचे पुनरावलोकन केले आणि ती मंजूर झाली नाही.', cta: 'पहा' },
  },
  VM_WITHDREW: {
    EN: { subject: 'A Vratmitra has withdrawn', body: 'A Vratmitra has withdrawn from one of your journeys.', cta: 'View journey' },
    MR: { subject: 'एक व्रतमित्र मागे हटला आहे', body: 'तुमच्या एका प्रवासातून एक व्रतमित्र मागे हटला आहे.', cta: 'प्रवास पहा' },
  },
};

const FOOTER: Record<Lang, string> = {
  EN: 'You can manage which emails you receive in your account settings.',
  MR: 'तुम्हाला कोणते ईमेल मिळतात हे तुम्ही तुमच्या खाते सेटिंग्जमध्ये व्यवस्थापित करू शकता.',
};

export function NotificationEmail({ event, language, link }: Props): React.ReactElement {
  const c = COPY[event][language];
  return (
    <html>
      <head><meta charSet="utf-8" /><title>{c.subject}</title></head>
      <body style={{ fontFamily: 'sans-serif', color: '#1a1a1a', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Veervrat</p>
        <p>{c.body}</p>
        <p style={{ margin: '24px 0' }}>
          <a href={link} style={{ backgroundColor: '#2f5b4f', color: '#ffffff', padding: '12px 24px', textDecoration: 'none', borderRadius: '6px', display: 'inline-block' }}>
            {c.cta}
          </a>
        </p>
        <hr style={{ borderTop: '1px solid #eee', margin: '24px 0' }} />
        <p style={{ fontSize: '12px', color: '#999' }}>{FOOTER[language]}</p>
        <p style={{ fontSize: '12px', color: '#999' }}>{link}</p>
      </body>
    </html>
  );
}

export function getNotificationSubject(event: EmailableEvent, language: Lang): string {
  return COPY[event][language].subject;
}
