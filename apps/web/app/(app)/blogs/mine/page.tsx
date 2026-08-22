'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Pencil, BookOpen } from 'lucide-react';
import { blogsApi, type Blog } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export default function MyBlogsPage() {
  const t = useTranslations('blogs');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.blogs.mine,
    queryFn: () => blogsApi.listMine(),
  });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('myTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('mySubtitle')}</p>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href="/blogs/new" />}>
          <PenLine className="h-4 w-4" />
          <span className="ml-1.5">{t('write')}</span>
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Spinner size="lg" label={t('loading')} />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title={t('loadError')}
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t('retry')}
              </Button>
            }
          />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<PenLine className="h-5 w-5" />}
            title={t('emptyMineTitle')}
            description={t('emptyMineHint')}
            action={
              <Button size="sm" nativeButton={false} render={<Link href="/blogs/new" />}>
                {t('write')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {data!.items.map((b: Blog) => (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card"
              >
                <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                  {b.isDraft && (
                    <Badge
                      variant="secondary"
                      className="bg-warning/16 px-2 py-0.5 text-[11px] font-medium text-warning"
                    >
                      {t('draft')}
                    </Badge>
                  )}
                  <span>{new Date(b.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={b.isDraft ? `/blogs/${b.id}/edit` : `/community/blogs/${b.id}`}
                    className="min-w-0 truncate font-display text-[18px] hover:text-accent"
                  >
                    {b.title}
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full"
                    nativeButton={false}
                    render={<Link href={`/blogs/${b.id}/edit`} />}
                  >
                    <Pencil className="h-3 w-3" /> {t('edit')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
