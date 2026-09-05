import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import Link from 'next/link';
import { renderWithProviders } from './helpers/render';
import { Button } from '@/components/ui/button';

/**
 * A link styled as a button is still a link.
 *
 * The underlying Base UI primitive stamps `role="button"` on whatever it renders, anchors
 * included, which overrides the anchor's implicit `link` role. That is not cosmetic:
 *
 *  - a screen reader announces the control as a button, so it vanishes from the "list all links"
 *    navigation that is a primary way of moving around a page;
 *  - `role="button"` promises that Space activates the control, which a plain anchor does not do,
 *    so the announced role and the actual keyboard behaviour disagree.
 *
 * Every use of `nativeButton={false}` in this app renders an anchor — 25 `<Link>` and 3 `<a>` at
 * the time of writing — so the wrapper treats that prop as the signal and supplies `role="link"`.
 */
describe('Button rendered as a link', () => {
  it('is announced as a link, not a button', () => {
    renderWithProviders(
      <Button nativeButton={false} render={<Link href="/journeys" />}>
        Open
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/journeys');
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });

  it('works for a plain anchor too, not only next/link', () => {
    renderWithProviders(
      <Button nativeButton={false} render={<a href="https://example.test/oauth" />}>
        Continue with Google
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Continue with Google' })).toBeInTheDocument();
  });

  // The control. Without this, a wrapper that set role="link" unconditionally would pass every
  // assertion above while breaking every real button in the app.
  it('a normal button is still a button', () => {
    renderWithProviders(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Save' })).not.toBeInTheDocument();
  });

  // The escape hatch, for the day something renders an anchor that genuinely is not a link —
  // a disclosure control, say. An explicit role must still win.
  it('an explicitly supplied role wins over the default', () => {
    renderWithProviders(
      <Button nativeButton={false} role="menuitem" render={<a href="#x" />}>
        Choose
      </Button>,
    );

    expect(screen.getByRole('menuitem', { name: 'Choose' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Choose' })).not.toBeInTheDocument();
  });

  it('keeps the button styling — this is a semantics fix, not a visual one', () => {
    const { container } = renderWithProviders(
      <Button nativeButton={false} render={<Link href="/x" />}>
        Styled
      </Button>,
    );

    const anchor = container.querySelector('a');
    expect(anchor).toHaveAttribute('data-slot', 'button');
    expect(anchor?.className).toContain('inline-flex');
  });
});
