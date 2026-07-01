'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, EyeOff, Trash2, Flag } from 'lucide-react';
import { blogsApi, type BlogComment } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { MessageContent } from '@/components/chat/message-content';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('blogs');
  const format = useFormatter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [comment, setComment] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.blogs.detail(id),
    queryFn: () => blogsApi.getOne(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.blogs.detail(id) });

  const addComment = useMutation({
    mutationFn: () => blogsApi.addComment(id, comment.trim()),
    onSuccess: () => { setComment(''); invalidate(); },
    onError: () => toast({ title: t('commentError'), variant: 'destructive' }),
  });
  const del = useMutation({
    mutationFn: (cid: string) => blogsApi.deleteComment(id, cid),
    onSuccess: invalidate,
    onError: () => toast({ title: t('moderationError'), variant: 'destructive' }),
  });
  const hide = useMutation({
    mutationFn: (cid: string) => blogsApi.hideComment(id, cid),
    onSuccess: invalidate,
    onError: () => toast({ title: t('moderationError'), variant: 'destructive' }),
  });
  const report = useMutation({
    mutationFn: (cid: string) => blogsApi.reportComment(id, cid),
    onSuccess: () => toast({ title: t('reported') }),
    onError: () => toast({ title: t('moderationError'), variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Spinner size="lg" /></div>;
  }
  if (isError || !data) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title={t('notFound')}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        }
      />
    );
  }

  const isMod = (user?.roles ?? []).some((r) => r === 'MODERATOR' || r === 'ADMIN');
  const isBlogAuthor = user?.id === data.authorId;
  const canModerate = (c: BlogComment) => isBlogAuthor || isMod || c.authorId === user?.id;

  return (
    <article>
      <h1 className="font-display text-[clamp(26px,3vw,36px)] font-medium leading-tight tracking-tight">{data.title}</h1>
      <div className="mt-2 text-[13px] text-muted">
        <Link href={`/u/${data.author.username}`} className="hover:text-accent">{data.author.displayName}</Link>
        {' · '}{format.dateTime(new Date(data.publishedAt ?? data.createdAt), { dateStyle: 'medium' })}
      </div>

      <div className="prose mt-6 max-w-none overflow-x-auto text-[16px] leading-relaxed [&_img]:max-w-full [&_img]:rounded-xl [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
        <MessageContent content={data.body} />
      </div>

      {/* Comments */}
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-4 text-[16px] font-medium">{t('comments', { count: data.comments.length })}</h2>

        {isAuthenticated ? (
          <div className="mb-5">
            <Label htmlFor="blog-comment" className="sr-only">{t('commentPlaceholder')}</Label>
            <Textarea
              id="blog-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('commentPlaceholder')}
              className="h-20 resize-none rounded-xl border-border bg-surface px-3 py-2 text-[14px]"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" loading={addComment.isPending} disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
                {t('postComment')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-xl border border-dashed border-border-strong p-4 text-center text-[13px] text-muted">
            {t('loginToComment')} <Link href="/login" className="text-accent">{t('login')}</Link>
          </div>
        )}

        <div className="space-y-3">
          {data.comments.map((c) => (
            <div key={c.id} className={`rounded-xl border border-border bg-surface p-3 ${c.isHidden ? 'opacity-60' : ''}`}>
              <div className="mb-1 flex items-center gap-2 text-[12px] text-muted">
                <span className="font-medium text-fg">{c.author.displayName}</span>
                <span>{format.dateTime(new Date(c.createdAt), { dateStyle: 'medium' })}</span>
                {c.isHidden && <span className="rounded-full bg-muted/15 px-2 py-0.5 text-[10px]">{t('hidden')}</span>}
              </div>
              <p className="text-[14px]">{c.body}</p>
              {isAuthenticated && (
                <div className="mt-1 flex gap-1 text-[11px] text-muted">
                  {(isBlogAuthor || isMod) && !c.isHidden && (
                    <Button variant="ghost" size="sm" onClick={() => hide.mutate(c.id)} disabled={hide.isPending && hide.variables === c.id} className="h-auto gap-1 px-2 py-1 text-[11px]"><EyeOff className="h-3 w-3" /> {t('hide')}</Button>
                  )}
                  {canModerate(c) && (
                    <Button variant="ghost" size="sm" onClick={() => del.mutate(c.id)} disabled={del.isPending && del.variables === c.id} className="h-auto gap-1 px-2 py-1 text-[11px] hover:text-danger"><Trash2 className="h-3 w-3" /> {t('delete')}</Button>
                  )}
                  {c.authorId !== user?.id && (
                    <Button variant="ghost" size="sm" onClick={() => report.mutate(c.id)} disabled={report.isPending && report.variables === c.id} className="h-auto gap-1 px-2 py-1 text-[11px] hover:text-warning"><Flag className="h-3 w-3" /> {t('report')}</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
