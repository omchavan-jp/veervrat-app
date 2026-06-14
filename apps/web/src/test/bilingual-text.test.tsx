import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BilingualText } from '@/components/shared/bilingual-text';

describe('BilingualText', () => {
  it('renders Devanagari as primary and English as secondary when both present', () => {
    const { container } = render(<BilingualText en="Bad communication" mr="विसंवाद" />);

    const mr = screen.getByText('विसंवाद');
    const en = screen.getByText('Bad communication');

    expect(mr).toBeInTheDocument();
    expect(en).toBeInTheDocument();
    // Devanagari line carries the font-deva class (primary script styling).
    expect(mr.className).toContain('font-deva');
    // English line is muted (secondary).
    expect(en.className).toContain('text-muted');
  });

  it('shows both scripts regardless of which is "primary" — content is never toggled away', () => {
    render(<BilingualText en="Laziness" mr="आळस" />);
    expect(screen.getByText('आळस')).toBeInTheDocument();
    expect(screen.getByText('Laziness')).toBeInTheDocument();
  });

  it('falls back to English-only when no Marathi is available', () => {
    render(<BilingualText en="Ineffectiveness" mr={null} />);
    const en = screen.getByText('Ineffectiveness');
    expect(en).toBeInTheDocument();
    // No muted secondary line in fallback mode.
    expect(en.className).not.toContain('text-muted');
  });

  it('renders with the requested wrapper element', () => {
    const { container } = render(<BilingualText en="X" mr="क्ष" as="h1" />);
    expect(container.querySelector('h1')).toBeInTheDocument();
  });
});
