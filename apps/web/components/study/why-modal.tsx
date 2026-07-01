'use client';

import { useTranslations } from 'next-intl';
import { CmsInfoModal } from '@/components/shared/cms-info-modal';

// Strings live under the shared `study.why` namespace so this component isn't coupled
// to the 'browser' screen namespace when reused on the weakness detail page.
export function WhyModal() {
  const t = useTranslations('study.why');

  return (
    <CmsInfoModal
      cmsKey="why-weaknesses"
      linkLabel={t('link')}
      fallbackTitle={t('title')}
      fallbackBody={t('body')}
    />
  );
}
