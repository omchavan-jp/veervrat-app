'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BookText } from 'lucide-react';
import { experienceLogsApi, type ExperienceLog } from '@/lib/api/experience-logs';
import { queryKeys } from '@/lib/api/query-keys';
import { excerptFromDoc } from '@/components/experience/experience-excerpt';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function PublicExperiencesPage() {
  const t = useTranslations('experiences');

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.experiences.public,
      queryFn: ({ pageParam }) => experienceLogsApi.getPublic(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items: ExperienceLog[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <h1 className="font-display text-[30px] font-medium tracking-tight">{t('poolTitle')}</h1>
      <p className="mt-1 text-[14px] text-muted">{t('poolSubtitle')}</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<BookText className="h-5 w-5" />}
            title={t('loadError')}
            description={t('loadErrorHint')}
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t('retry')}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BookText className="h-5 w-5" />}
            title={t('poolEmpty')}
            description={t('poolEmptyHint')}
          />
        ) : (
          <>
            <div className="space-y-3">
              {items.map((e) => (
                <article
                  key={e.id}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-card"
                >
                  <div className="mb-1.5 flex items-center gap-2 text-[12px] text-muted">
                    <Link
                      href={`/u/${e.author.username}`}
                      className="font-medium text-fg hover:text-accent"
                    >
                      {e.author.displayName}
                    </Link>
                    <span>·</span>
                    <span>{new Date(e.publishedAt ?? e.createdAt).toLocaleDateString()}</span>
                  </div>
                  {/* The pool used to link only to the author's profile, because there was no
                      page for the log itself (#190). Both links now exist: the author, and the
                      writing the reader came for. */}
                  <Link
                    href={`/community/experiences/${e.id}`}
                    className="block text-[14px] leading-relaxed hover:text-accent"
                  >
                    {excerptFromDoc(e.body)}
                  </Link>
                  {e.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.tags.map((tg) => (
                        <span
                          key={tg.id ?? `${tg.entityType}-${tg.entityId}`}
                          className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
                        >
                          {t(`tagType.${tg.entityType}`)}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-5 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? t('loading') : t('loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
