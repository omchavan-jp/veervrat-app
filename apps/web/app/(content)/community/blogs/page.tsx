'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { BookOpen, Search } from 'lucide-react';
import { blogsApi, type Blog } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/empty-state';

function BlogCard({ b }: { b: Blog }) {
  return (
    <Link href={`/community/blogs/${b.id}`} className="block rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent/30">
      <h2 className="font-display text-[20px] leading-tight tracking-tight">{b.title}</h2>
      <div className="mt-2 text-[12px] text-muted">
        {b.author.displayName} · {new Date(b.publishedAt ?? b.createdAt).toLocaleDateString()}
      </div>
    </Link>
  );
}

export default function CommunityBlogsPage() {
  const t = useTranslations('blogs');
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);
  const searching = debounced.trim().length >= 2;

  const list = useInfiniteQuery({
    queryKey: queryKeys.blogs.list,
    queryFn: ({ pageParam }) => blogsApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !searching,
  });

  const search = useQuery({
    queryKey: queryKeys.blogs.search(debounced),
    queryFn: () => blogsApi.search(debounced),
    enabled: searching,
  });

  const items: Blog[] = searching ? (search.data ?? []) : (list.data?.pages.flatMap((p) => p.items) ?? []);
  const loading = searching ? search.isLoading : list.isLoading;

  return (
    <div>
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('communityTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('communitySubtitle')}</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-accent"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-5 w-5" />} title={searching ? t('noResults') : t('emptyTitle')} description={searching ? undefined : t('emptyHint')} />
        ) : (
          <div className="space-y-3">
            {items.map((b) => <BlogCard key={b.id} b={b} />)}
            {!searching && list.hasNextPage && (
              <div className="flex justify-center pt-2">
                <button onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage} className="rounded-full border border-border-strong px-4 py-1.5 text-[13px] hover:border-accent">
                  {list.isFetchingNextPage ? t('loading') : t('loadMore')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
