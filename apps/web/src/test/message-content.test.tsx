import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/render';
import { MessageContent, type TiptapDoc } from '@/components/chat/message-content';

// next/image and next/link render fine in jsdom, but stub next/link to a plain anchor
// to assert hrefs simply.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const doc = (...content: unknown[]): TiptapDoc => ({ type: 'doc', content: content as never });

describe('MessageContent', () => {
  it('renders plain paragraph text', () => {
    renderWithProviders(
      <MessageContent content={doc({ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] })} />,
    );
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('renders an entity chip with a link for navigable types', () => {
    renderWithProviders(
      <MessageContent
        content={doc({
          type: 'paragraph',
          content: [
            { type: 'entityHash', attrs: { entityType: 'journey', entityId: 'j1', label: 'My Journey' } },
          ],
        })}
      />,
    );
    const link = screen.getByText('My Journey').closest('a');
    expect(link).toHaveAttribute('href', '/journeys/j1');
  });

  it('renders a non-navigable concept mention as plain text (no link)', () => {
    renderWithProviders(
      <MessageContent
        content={doc({
          type: 'paragraph',
          content: [{ type: 'entityHash', attrs: { entityType: 'virtue', entityId: 'v1', label: 'धैर्य' } }],
        })}
      />,
    );
    const el = screen.getByText('धैर्य');
    expect(el.closest('a')).toBeNull();
  });

  it('renders an image node', () => {
    const { container } = renderWithProviders(
      <MessageContent content={doc({ type: 'image', attrs: { src: 'https://cdn.example.com/a.png' } })} />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/a.png');
  });

  it('applies bold marks', () => {
    renderWithProviders(
      <MessageContent
        content={doc({ type: 'paragraph', content: [{ type: 'text', text: 'strong', marks: [{ type: 'bold' }] }] })}
      />,
    );
    expect(screen.getByText('strong').closest('strong')).not.toBeNull();
  });
});
