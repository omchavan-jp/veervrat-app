import { Suspense } from 'react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import enMessages from '../../messages/en.json';
import { renderWithProviders } from './helpers/render';
import ExperienceDetailPage from '@/app/(content)/community/experiences/[id]/page';

const getOne = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/experience-logs', () => ({
  experienceLogsApi: { getOne: (id: string) => getOne(id) },
}));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => useAuthMock() }));

const AUTHOR = 'author-1';

const log = (over: Record<string, unknown> = {}) => ({
  id: 'log-1',
  authorId: AUTHOR,
  author: { username: 'vratarthi', displayName: 'A Vratarthi' },
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A reflection.' }] }] },
  visibility: 'ONLY_ME',
  isDraft: false,
  publishedAt: '2026-08-20T00:00:00.000Z',
  createdAt: '2026-08-20T00:00:00.000Z',
  tags: [],
  ...over,
});

// `params` is a promise in the App Router and `use()` suspends on it. Next.js supplies a
// boundary at the route level; a test has to provide its own or nothing ever renders.
const renderPage = async () => {
  let result!: ReturnType<typeof renderWithProviders>;
  // An async act, because `use()` suspends on the params promise and the resolution has to be
  // flushed before anything commits. A synchronous render leaves the tree in fallback forever.
  await act(async () => {
    result = renderWithProviders(
      <Suspense fallback={null}>
        <ExperienceDetailPage params={Promise.resolve({ id: 'log-1' })} />
      </Suspense>,
    );
  });
  return result;
};

describe('ExperienceDetailPage', () => {
  beforeEach(() => {
    getOne.mockReset();
    useAuthMock.mockReturnValue({ user: { id: AUTHOR }, isAuthenticated: true });
  });

  it('renders a log the API returns', async () => {
    getOne.mockResolvedValue(log());
    await renderPage();
    expect(await screen.findByText('A reflection.')).toBeInTheDocument();
    expect(screen.getByText('A Vratarthi')).toBeInTheDocument();
  });

  it('shows the author their visibility, and does not show it to another reader', async () => {
    getOne.mockResolvedValue(log({ visibility: 'PUBLIC' }));
    const { unmount } = await renderPage();
    expect(await screen.findByText(/Public/)).toBeInTheDocument();
    unmount();

    useAuthMock.mockReturnValue({ user: { id: 'someone-else' }, isAuthenticated: true });
    getOne.mockResolvedValue(log({ visibility: 'PUBLIC' }));
    await renderPage();
    await screen.findByText('A reflection.');
    // Which visibility a log carries is the author's business, not a reader's.
    expect(screen.queryByText(/Public/)).not.toBeInTheDocument();
  });

  it('offers the editor to the author only', async () => {
    getOne.mockResolvedValue(log());
    // Asserted as a link to the editor rather than by accessible name: the name is assembled
    // from an icon plus text, and what matters is that the author can actually get there.
    const editHref = 'a[href="/experiences/log-1/edit"]';

    const { unmount, container } = await renderPage();
    await screen.findByText('A reflection.');
    expect(container.querySelector(editHref)).not.toBeNull();
    expect(container.textContent).toContain(enMessages.experiences.edit);
    unmount();

    useAuthMock.mockReturnValue({ user: { id: 'someone-else' }, isAuthenticated: true });
    getOne.mockResolvedValue(log());
    const second = await renderPage();
    await screen.findByText('A reflection.');
    expect(second.container.querySelector(editHref)).toBeNull();
  });

  it('renders a refusal exactly as a missing log, revealing nothing', async () => {
    // The API returns the same 404 for "does not exist" and "you may not read this". If this page
    // said anything different for the second, it would confirm that a given log exists and
    // belongs to somebody — which is what an unauthorised reader would be probing for.
    getOne.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false });

    await renderPage();

    expect(await screen.findByText(enMessages.experiences.notFound)).toBeInTheDocument();
    for (const leak of [/not allowed/i, /permission/i, /forbidden/i, /private/i, /sign in/i]) {
      expect(screen.queryByText(leak)).not.toBeInTheDocument();
    }
  });
});
