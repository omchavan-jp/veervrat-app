import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n-constants';
import { applyOverrides, type NestedMessages } from '@/lib/content-editor/messages';

const CONTENT_EDIT = process.env.NEXT_PUBLIC_CONTENT_EDIT === 'on';

export default getRequestConfig(async () => {
  const headerStore = await headers();
  const raw = headerStore.get('X-Next-Locale') ?? 'en';
  const locale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : 'en';

  const imported = (await import(`../messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };
  let messages = imported.default;

  // Content-edit mode only: overlay staged overrides so an editor sees edits live. Off in
  // production, where message loading is exactly the baked catalog (no fetch, no change).
  if (CONTENT_EDIT) {
    const overrides = await fetchOverrides(locale);
    if (overrides && Object.keys(overrides).length > 0) {
      messages = applyOverrides(messages as NestedMessages, overrides) as Record<string, unknown>;
    }
  }

  return { locale, messages };
});

// Best-effort fetch of staged overrides for a locale; any failure falls back to the baked
// messages so the page always renders.
async function fetchOverrides(locale: Locale): Promise<Record<string, string> | null> {
  const jar = await cookies();
  // Only an allowlisted editor's client sets `ve_ce`; skip entirely otherwise so regular
  // users pay no latency and never receive staged (unpublished) copy.
  if (jar.get('ve_ce')?.value !== '1') return null;
  const session = jar.get('veervrat_session')?.value;
  if (!session) return null;
  const origin = process.env.API_ORIGIN || 'http://localhost:3001';
  try {
    const res = await fetch(`${origin}/api/v1/content-overrides`, {
      cache: 'no-store',
      headers: { Cookie: `veervrat_session=${session}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Partial<Record<Locale, Record<string, string>>> };
    return body.data?.[locale] ?? null;
  } catch {
    return null;
  }
}
