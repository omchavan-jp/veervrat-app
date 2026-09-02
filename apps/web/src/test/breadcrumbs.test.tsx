import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '@/messages/en.json';
import mr from '@/messages/mr.json';
import { Breadcrumbs, BackLink } from '@/components/shared/breadcrumbs';

/**
 * One way back, in one form (#33).
 *
 * Four pages in the virtue drill-down each built their own back link and no two matched: two used
 * an `<ArrowLeft/>` icon and two a literal `←`; two pointed at the parent entity and two at the
 * top-level list; none showed more than one level. A person cannot learn a rule that is only
 * sometimes true.
 *
 * ⚠️ The most important assertion here is a NEGATIVE one — that `/weaknesses/[id]` claims no
 * ancestry. A weakness maps to many subvirtues (`WeaknessSubvirtue` is a join table), so it has no
 * single parent, and #33's own title asks for a "weakness↔virtue drill-down" breadcrumb that the
 * data cannot support. That makes it the likeliest mistake in this change.
 */
function renderIn(locale: 'en' | 'mr', ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : mr}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const page = (p: string) => readFileSync(join(process.cwd(), 'app', '(content)', p), 'utf8');

afterEach(cleanup);

describe('Breadcrumbs', () => {
  const crumbs = [
    { href: '/virtues', en: 'Virtues' },
    { href: '/virtues/v1', en: 'Ahimsa', mr: 'अहिंसा' },
  ];

  it('links every ancestor and not the current page', () => {
    renderIn('en', <Breadcrumbs label="Breadcrumb" crumbs={crumbs} current={{ en: 'Patience' }} />);
    expect(screen.getByRole('link', { name: 'Virtues' })).toHaveAttribute('href', '/virtues');
    expect(screen.getByRole('link', { name: 'Ahimsa' })).toHaveAttribute('href', '/virtues/v1');
    // You are already here — a link to the current page is a dead control.
    expect(screen.queryByRole('link', { name: 'Patience' })).toBeNull();
    // `aria-current` sits on the list item; getByText returns the span ContentText renders
    // inside it, so the assertion has to walk up to the element that carries the state.
    expect(screen.getByText('Patience').closest('li')).toHaveAttribute('aria-current', 'page');
  });

  it('is a named landmark, so it can be skipped', () => {
    renderIn('en', <Breadcrumbs label="Breadcrumb" crumbs={crumbs} current={{ en: 'Patience' }} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
  });

  it('renders each crumb in the reader’s language', () => {
    // Crumbs are entity names, not interface copy — so an English-only check exercises none of
    // the bilingual path.
    renderIn(
      'mr',
      <Breadcrumbs label="मार्गसूची" crumbs={crumbs} current={{ en: 'Patience', mr: 'संयम' }} />,
    );
    expect(screen.getByRole('link', { name: 'अहिंसा' })).toBeTruthy();
    expect(screen.getByText('संयम')).toBeTruthy();
  });

  it('falls back to English when a name has no Marathi', () => {
    // Content is sometimes English-only. A missing translation must not render an empty crumb.
    renderIn('mr', <Breadcrumbs label="मार्गसूची" crumbs={crumbs} current={{ en: 'Patience' }} />);
    expect(screen.getByRole('link', { name: 'Virtues' })).toBeTruthy();
    expect(screen.getByText('Patience')).toBeTruthy();
  });
});

describe('the pages that adopted it', () => {
  it('/virtues/[id] shows the root', () => {
    expect(page('virtues/[id]/page.tsx')).toMatch(/<Breadcrumbs/);
  });

  it('/subvirtues/[id] shows its parent virtue', () => {
    const src = page('subvirtues/[id]/page.tsx');
    expect(src).toMatch(/<Breadcrumbs/);
    expect(src).toMatch(/data\.virtue\.id/);
  });

  it('/sentences/[id] shows the WHOLE ancestry — the page that gains something', () => {
    // Previously it linked only its subvirtue, so reaching the virtue took two hops through a
    // page nobody wanted.
    const src = page('sentences/[id]/page.tsx');
    expect(src).toMatch(/<Breadcrumbs/);
    expect(src).toMatch(/data\.subvirtue\.virtue\.id/);
    expect(src).toMatch(/data\.subvirtue\.id/);
  });

  it('⚠️ /weaknesses/[id] claims NO ancestry, because it has none', () => {
    const src = page('weaknesses/[id]/page.tsx');
    expect(src).not.toMatch(/<Breadcrumbs/);
    expect(src).toMatch(/<BackLink/);
  });
});

describe('there is one implementation, not five', () => {
  const pages = [
    'virtues/[id]/page.tsx',
    'subvirtues/[id]/page.tsx',
    'sentences/[id]/page.tsx',
    'weaknesses/[id]/page.tsx',
  ];

  it('no hand-built back link survives', () => {
    for (const p of pages) {
      const src = page(p);
      // The two old affordances: an ArrowLeft icon, and a literal ← character.
      expect(src, `${p} still uses ArrowLeft`).not.toMatch(/ArrowLeft/);
      expect(src, `${p} still uses a literal arrow`).not.toMatch(/←/);
    }
  });

  it('and none of them hides one instead of removing it', () => {
    // Hiding the old link rather than deleting it would leave a fifth variant in the codebase,
    // invisible and waiting to be re-enabled.
    for (const p of pages) {
      expect(page(p), `${p} has a hidden leftover`).not.toMatch(/className="hidden"/);
    }
  });
});

describe('BackLink', () => {
  it('offers the way back without asserting a parent', () => {
    renderIn('en', <BackLink href="/virtues" label="Back to the browser" />);
    expect(screen.getByRole('link', { name: 'Back to the browser' })).toHaveAttribute(
      'href',
      '/virtues',
    );
  });
});
