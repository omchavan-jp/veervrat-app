'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function WhyModal() {
  const t = useTranslations('study.browser.whyModal');
  const tBrowser = useTranslations('study.browser');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-accent-2 underline decoration-accent-2/40 hover:no-underline"
      >
        {tBrowser('whyLink')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-surface p-8 shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-display text-[24px] tracking-tight">{t('title')}</h2>
            <p className="text-[15px] leading-relaxed text-muted">{t('body')}</p>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex h-auto items-center justify-center rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
