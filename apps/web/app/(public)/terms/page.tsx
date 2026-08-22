import { PolicyDocument } from '@/components/shared/policy-document';

export const metadata = { title: 'Terms of Use · Veervrat' };

export default function TermsPage() {
  return <PolicyDocument cmsKey="terms" fallbackTitle="Terms of Use" />;
}
