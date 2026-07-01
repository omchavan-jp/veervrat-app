import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';
import { renderWithProviders } from './helpers/render';

describe('BilingualText', () => {
  it('in EN locale: English is primary, Devanagari is the muted secondary', () => {
    renderWithProviders(<BilingualText en="Bad communication" mr="विसंवाद" />, 'en');
    const en = screen.getByText('Bad communication');
    const mr = screen.getByText('विसंवाद');
    expect(en.className).not.toContain('text-muted'); // primary
    expect(mr.className).toContain('text-muted'); // secondary
    expect(mr.className).toContain('font-deva');
  });

  it('in MR locale: Devanagari is primary, English is the muted secondary', () => {
    renderWithProviders(<BilingualText en="Bad communication" mr="विसंवाद" />, 'mr');
    const mr = screen.getByText('विसंवाद');
    const en = screen.getByText('Bad communication');
    expect(mr.className).toContain('font-deva');
    expect(mr.className).not.toContain('text-muted'); // primary
    expect(en.className).toContain('text-muted'); // secondary
  });

  it('shows both scripts in either locale — content keeps both lines', () => {
    renderWithProviders(<BilingualText en="Laziness" mr="आळस" />, 'en');
    expect(screen.getByText('आळस')).toBeInTheDocument();
    expect(screen.getByText('Laziness')).toBeInTheDocument();
  });

  it('falls back to English-only when no Marathi is available', () => {
    renderWithProviders(<BilingualText en="Ineffectiveness" mr={null} />, 'mr');
    const en = screen.getByText('Ineffectiveness');
    expect(en).toBeInTheDocument();
    expect(en.className).not.toContain('text-muted'); // no secondary line in fallback
  });

  it('renders with the requested wrapper element', () => {
    const { container } = renderWithProviders(<BilingualText en="X" mr="क्ष" as="h1" />, 'en');
    expect(container.querySelector('h1')).toBeInTheDocument();
  });
});

describe('ContentText (single-language, toggle-driven)', () => {
  it('shows only English in EN locale', () => {
    renderWithProviders(<ContentText en="Courage" mr="धैर्य" />, 'en');
    expect(screen.getByText('Courage')).toBeInTheDocument();
    expect(screen.queryByText('धैर्य')).not.toBeInTheDocument();
  });

  it('shows only Devanagari (font-deva) in MR locale', () => {
    renderWithProviders(<ContentText en="Courage" mr="धैर्य" />, 'mr');
    const mr = screen.getByText('धैर्य');
    expect(mr).toBeInTheDocument();
    expect(mr.className).toContain('font-deva');
    expect(screen.queryByText('Courage')).not.toBeInTheDocument();
  });

  it('falls back to English when MR is missing, even in MR locale', () => {
    renderWithProviders(<ContentText en="Courage" mr={null} />, 'mr');
    expect(screen.getByText('Courage')).toBeInTheDocument();
  });
});
