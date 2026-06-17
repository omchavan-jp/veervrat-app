'use client';

import { useTranslations } from 'next-intl';
import { CmsInfoModal } from '@/components/shared/cms-info-modal';

export function WhyModal() {
  const t = useTranslations('study.browser.whyModal');
  const tBrowser = useTranslations('study.browser');

  return (
    <CmsInfoModal
      cmsKey="why-weaknesses"
      linkLabel={tBrowser('whyLink')}
      fallbackTitle={t('title')}
      fallbackBody={t('body')}
    />
  );
}
