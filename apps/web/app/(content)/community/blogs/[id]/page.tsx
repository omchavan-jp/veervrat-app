'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Trash2, Flag } from 'lucide-react';
import { blogsApi, type BlogComment } from '@/lib/api/blogs';
import { queryKeys } from '@/lib/api/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { MessageContent } from '@/components/chat/message-content';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('blogs');
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [comment, setComment] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.blogs.detail(id),
    queryFn: () => blogsApi.getOne(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.blogs.detail(id) });

  const addComment = useMutation({
    mutationFn: () => blogsApi.addComment(id, comment.trim()),
    onSuccess: () => { setComment(''); invalidate(); },
  });
  const del = useMutation({ mutationFn: (cid: string) => blogsApi.deleteComment(id, cid), onSuccess: invalidate });
  const hide = useMutation({ mutationFn: (cid: string) => blogsApi.hideComment(id, cid), onSuccess: invalidate });
  const report = useMutation({
    mutationFn: (cid: string) => blogsApi.reportComment(id, cid),
    onSuccess: () => toast({ title: t('reported') }),
  });

  if (isLoading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }
  if (isError || !data) return <div className="text-muted">{t('notFound')}</div>;

  const isMod = (user?.roles ?? []).some((r) => r === 'MODERATOR' || r === 'ADMIN');
  const isBlogAuthor = user?.id === data.authorId;
  const canModerate = (c: BlogComment) => isBlogAuthor || isMod || c.authorId === user?.id;

  return (
    <article>
      <h1 className="font-display text-[clamp(26px,3vw,36px)] font-medium leading-tight tracking-tight">{data.title}</h1>
      <div className="mt-2 text-[13px] text-muted">
        <Link href={`/u/${data.author.username}`} className="hover:text-accent">{data.author.displayName}</Link>
        {' · '}{new Date(data.publishedAt ?? data.createdAt).toLocaleDateString()}
      </div>

      <div className="prose mt-6 max-w-none text-[16px] leading-relaxed [&_img]:rounded-xl">
        <MessageContent content={data.body} />
      </div>

      {/* Comments */}
      <section className="mt-10 border-t border-border pt-6">
        <h2 className="mb-4 text-[16px] font-medium">{t('comments', { count: data.comments.length })}</h2>

        {isAuthenticated ? (
          <div className="mb-5">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('commentPlaceholder')}
              className="h-20 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
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
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                {c.isHidden && <span className="rounded-full bg-muted/15 px-2 py-0.5 text-[10px]">{t('hidden')}</span>}
              </div>
              <p className="text-[14px]">{c.body}</p>
              {isAuthenticated && (
                <div className="mt-2 flex gap-3 text-[11px] text-muted">
                  {(isBlogAuthor || isMod) && !c.isHidden && (
                    <button onClick={() => hide.mutate(c.id)} className="inline-flex items-center gap-1 hover:text-fg"><EyeOff className="h-3 w-3" /> {t('hide')}</button>
                  )}
                  {canModerate(c) && (
                    <button onClick={() => del.mutate(c.id)} className="inline-flex items-center gap-1 hover:text-danger"><Trash2 className="h-3 w-3" /> {t('delete')}</button>
                  )}
                  {c.authorId !== user?.id && (
                    <button onClick={() => report.mutate(c.id)} className="inline-flex items-center gap-1 hover:text-warning"><Flag className="h-3 w-3" /> {t('report')}</button>
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
