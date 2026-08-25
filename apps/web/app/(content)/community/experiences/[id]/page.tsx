'use client';

import { use } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BookText, Pencil } from 'lucide-react';
import { experienceLogsApi } from '@/lib/api/experience-logs';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { MessageContent } from '@/components/chat/message-content';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Reading a single experience log (#190).
 *
 * Lives in `(content)`, not `(app)`, and that is the decision this page rests on: the `(app)`
 * layout redirects anyone unauthenticated to `/login`, so a view there would be unreachable for
 * guests — contradicting `PUBLIC` visibility, which exists precisely to be shared. Mirrors
 * `(content)/community/blogs/[id]`, which experiences already match in every other route.
 *
 * **No authorisation is decided here.** `GET /experience-logs/:id` already resolves guests,
 * ONLY_ME, FRIENDS by mutual follow, drafts and the permission system, and refuses in a shape
 * that does not distinguish "not allowed" from "does not exist". This page asks and renders.
 * Re-deriving any of that would create a second authority that has to agree with the first —
 * the exact arrangement #178 spent a day removing from the uploads path.
 */
export default function ExperienceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('experiences');
  const format = useFormatter();
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.experiences.detail(id),
    queryFn: () => experienceLogsApi.getOne(id),
    // A refusal is a 404 by design and will never succeed on a retry, so retrying only delays
    // telling the reader.
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // One branch for "no such log" and for "you may not read this one". The API deliberately does
  // not distinguish them — a different message here would leak that a given log exists and
  // belongs to somebody, which is what an unauthorised reader would be probing for.
  if (isError || !data) {
    return (
      <EmptyState
        icon={<BookText className="h-5 w-5" />}
        title={t('notFound')}
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        }
      />
    );
  }

  const isAuthor = user?.id === data.authorId;

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <Link href={`/u/${data.author.username}`} className="font-medium text-fg hover:text-accent">
          {data.author.displayName}
        </Link>
        <span>·</span>
        <span>
          {format.dateTime(new Date(data.publishedAt ?? data.createdAt), { dateStyle: 'medium' })}
        </span>
        {data.isDraft && (
          <span className="rounded-full bg-muted/15 px-2 py-0.5 text-[11px]">{t('draft')}</span>
        )}
        {/* Shown to the author only. Whether something is private, friends-only or public is the
            author's own decision to review — it is not information for other readers. */}
        {isAuthor && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
            {t('visibility')}: {t(`visibilityOption.${data.visibility}`)}
          </span>
        )}
      </div>

      <div className="prose mt-6 max-w-none overflow-x-auto text-[16px] leading-relaxed [&_img]:max-w-full [&_img]:rounded-xl [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
        <MessageContent content={data.body} />
      </div>

      {data.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {data.tags.map((tag) => (
            <span
              key={tag.id ?? `${tag.entityType}-${tag.entityId}`}
              className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
            >
              {t(`tagType.${tag.entityType}`)}
            </span>
          ))}
        </div>
      )}

      {isAuthor && (
        <div className="mt-8 border-t border-border pt-5">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            nativeButton={false}
            render={<Link href={`/experiences/${id}/edit`} />}
          >
            <Pencil className="h-3 w-3" /> {t('edit')}
          </Button>
        </div>
      )}
    </article>
  );
}
