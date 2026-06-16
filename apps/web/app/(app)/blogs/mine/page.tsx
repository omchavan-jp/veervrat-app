'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Pencil, BookOpen } from 'lucide-react';
import { blogsApi, type Blog } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export default function MyBlogsPage() {
  const t = useTranslations('blogs');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.blogs.mine,
    queryFn: () => blogsApi.listMine(),
  });

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-medium tracking-tight">{t('myTitle')}</h1>
          <p className="mt-1 text-[14px] text-muted">{t('mySubtitle')}</p>
        </div>
        <Link href="/blogs/new">
          <Button size="sm"><PenLine className="h-4 w-4" /><span className="ml-1.5">{t('write')}</span></Button>
        </Link>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : isError ? (
          <EmptyState icon={<BookOpen className="h-5 w-5" />} title={t('loadError')} action={<button onClick={() => refetch()} className="rounded-full border border-border-strong px-4 py-1.5 text-[13px] hover:border-accent">{t('retry')}</button>} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<PenLine className="h-5 w-5" />} title={t('emptyMineTitle')} description={t('emptyMineHint')} action={<Link href="/blogs/new"><Button size="sm">{t('write')}</Button></Link>} />
        ) : (
          <div className="space-y-3">
            {data!.items.map((b: Blog) => (
              <div key={b.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                  {b.isDraft && <span className="rounded-full bg-warning/16 px-2 py-0.5 font-medium text-warning">{t('draft')}</span>}
                  <span>{new Date(b.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Link href={b.isDraft ? `/blogs/${b.id}/edit` : `/community/blogs/${b.id}`} className="font-display text-[18px] hover:text-accent">
                    {b.title}
                  </Link>
                  <Link href={`/blogs/${b.id}/edit`} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-[12px] text-muted hover:border-accent">
                    <Pencil className="h-3 w-3" /> {t('edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
