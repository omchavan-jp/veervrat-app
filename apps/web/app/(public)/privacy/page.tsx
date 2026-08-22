import { PolicyDocument } from '@/components/shared/policy-document';

export const metadata = { title: 'Privacy Policy · Veervrat' };

export default function PrivacyPage() {
  return <PolicyDocument cmsKey="privacy" fallbackTitle="Privacy Policy" />;
}
