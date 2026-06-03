import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n-constants';

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const raw = headerStore.get('X-Next-Locale') ?? 'en';
  const locale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : 'en';

  const messages = (await import(`../messages/${locale}.json`)) as { default: Record<string, unknown> };

  return {
    locale,
    messages: messages.default,
  };
});
