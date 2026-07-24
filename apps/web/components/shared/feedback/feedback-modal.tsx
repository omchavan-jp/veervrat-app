'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ThumbsUp } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/api/query-keys';
import {
  feedbackApi,
  type FeedbackItem,
  type FeedbackItemType,
  type FeedbackListResponse,
} from '@/lib/api/feedback';
import type { FeedbackMode } from './feedback-widget';

const FEEDBACK_TYPES: FeedbackItemType[] = ['ISSUE', 'IMPROVEMENT', 'MODIFICATION', 'ADDITION'];

const feedbackFormSchema = z.object({
  type: z.enum(['ISSUE', 'IMPROVEMENT', 'MODIFICATION', 'ADDITION']),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});
type FeedbackFormInput = z.infer<typeof feedbackFormSchema>;

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

const STATUS_STYLES: Record<FeedbackItem['status'], string> = {
  NEW: 'bg-fg/5 text-muted',
  TRIAGED: 'bg-accent/10 text-accent',
  DONE: 'bg-success/10 text-success',
  DECLINED: 'bg-danger/10 text-danger',
};

export function FeedbackModal({
  mode,
  open,
  onOpenChange,
}: {
  mode: FeedbackMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('feedback');
  const showList = mode === 'test';
  const [tab, setTab] = useState<'list' | 'raise'>(showList ? 'list' : 'raise');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('subtitle')}
      className="md:w-[min(520px,calc(100vw-40px))]"
    >
      {showList && (
        <Tabs
          items={[
            { key: 'list', label: t('tabs.observations') },
            { key: 'raise', label: t('tabs.raise') },
          ]}
          active={tab}
          onChange={(key) => setTab(key as 'list' | 'raise')}
          className="mb-4"
        />
      )}
      {showList && tab === 'list' ? (
        <ObservationsList enabled={open} />
      ) : (
        <RaiseForm onDone={() => (showList ? setTab('list') : onOpenChange(false))} />
      )}
    </Dialog>
  );
}

function ObservationsList({ enabled }: { enabled: boolean }) {
  const t = useTranslations('feedback');
  const queryClient = useQueryClient();
  // Global toggle: ON shows every item's details inline. OFF (default) collapses details;
  // tapping an individual item expands just that one via expandedIds.
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Open items (NEW/TRIAGED) by default, matching the API default — DONE/DECLINED items
  // otherwise vanish from view with no confirmation anything happened.
  const [showResolved, setShowResolved] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const listKey = queryKeys.feedback.list(showResolved);

  const { data, isPending, isError } = useQuery({
    queryKey: listKey,
    queryFn: () => feedbackApi.list(undefined, showResolved),
    enabled,
  });

  const upvote = useMutation({
    mutationFn: (id: string) => feedbackApi.toggleUpvote(id),
    // Optimistic toggle; the settled invalidation reconciles with the server count.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<FeedbackListResponse>(listKey);
      queryClient.setQueryData<FeedbackListResponse>(listKey, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      hasUpvoted: !item.hasUpvoted,
                      upvoteCount: item.upvoteCount + (item.hasUpvoted ? -1 : 1),
                    }
                  : item,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      // Broad prefix invalidation — both the open and resolved views may be affected.
      void queryClient.invalidateQueries({ queryKey: ['feedback', 'list'] });
    },
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" label={t('list.loading')} />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-[14px] text-muted">{t('list.error')}</p>;
  }

  if (!data || data.items.length === 0) {
    return <p className="py-8 text-center text-[14px] text-muted">{t('list.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-4">
        <label className="flex items-center gap-2 text-[12px] text-muted">
          {t('list.showResolved')}
          <Switch
            aria-label={t('list.showResolved')}
            checked={showResolved}
            onCheckedChange={setShowResolved}
          />
        </label>
        <label className="flex items-center gap-2 text-[12px] text-muted">
          {t('list.showDetails')}
          <Switch
            aria-label={t('list.showDetails')}
            checked={showAllDetails}
            onCheckedChange={setShowAllDetails}
          />
        </label>
      </div>

      <ul className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto pr-1">
        {data.items.map((item) => {
          const resolutionNote =
            item.status === 'DONE' ? item.doneNote : item.status === 'DECLINED' ? item.declineReason : null;
          const hasDetails = Boolean(item.description) || Boolean(resolutionNote);
          const expanded = showAllDetails || expandedIds.has(item.id);
          return (
            <li
              key={item.id}
              onClick={() => hasDetails && !showAllDetails && toggleExpanded(item.id)}
              className={cn(
                'flex items-start justify-between gap-3 rounded-[14px] border border-border bg-surface p-3',
                hasDetails && !showAllDetails && 'cursor-pointer',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium leading-snug">{item.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-fg/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                    {t(`type.${item.type}`)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                      STATUS_STYLES[item.status],
                    )}
                  >
                    {t(`status.${item.status}`)}
                  </span>
                  <span className="text-[12px] text-muted">
                    {t('list.reportedBy', { name: item.reporter.displayName })}
                  </span>
                  {hasDetails && !showAllDetails && (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 text-muted transition-transform',
                        expanded && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  )}
                </div>
                {expanded && item.description && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] text-muted">
                    {item.description}
                  </p>
                )}
                {expanded && resolutionNote && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] text-muted">
                    <span className="font-medium text-fg">
                      {t(item.status === 'DONE' ? 'list.doneNoteLabel' : 'list.declineReasonLabel')}
                      {': '}
                    </span>
                    {resolutionNote}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  upvote.mutate(item.id);
                }}
                aria-pressed={item.hasUpvoted}
                aria-label={t('list.upvote')}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                  item.hasUpvoted
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted hover:text-fg',
                )}
              >
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                {item.upvoteCount}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RaiseForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('feedback');
  const toast = useToast();
  const pathname = usePathname();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedbackFormInput>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: { type: 'ISSUE' },
  });
  const selectedType = watch('type');

  const create = useMutation({
    mutationFn: (input: FeedbackFormInput) =>
      feedbackApi.create({
        ...input,
        // Auto-captured context — the tester never fills these in.
        route: pathname,
        locale,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'dev',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feedback', 'list'] });
      toast.add({ title: t('form.successTitle'), description: t('form.successDescription'), type: 'success' });
      reset({ type: 'ISSUE', title: '', description: '' });
      onDone();
    },
    onError: () => {
      toast.add({ title: t('form.errorTitle'), type: 'error' });
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => create.mutate(data))} className="flex flex-col gap-4">
      <div>
        <Label className={FIELD_LABEL}>{t('form.typeLabel')}</Label>
        <div className="flex gap-2" role="radiogroup" aria-label={t('form.typeLabel')}>
          {FEEDBACK_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selectedType === option}
              onClick={() => setValue('type', option)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
                selectedType === option
                  ? 'border-accent bg-accent/10 font-medium text-accent'
                  : 'border-border text-muted hover:text-fg',
              )}
            >
              {t(`type.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="feedback-title" className={FIELD_LABEL}>
          {t('form.titleLabel')}
        </Label>
        <Input
          id="feedback-title"
          maxLength={120}
          placeholder={t('form.titlePlaceholder')}
          {...register('title')}
        />
        {errors.title && (
          <p className="mt-1.5 text-[12px] text-danger">{t('form.titleRequired')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="feedback-description" className={FIELD_LABEL}>
          {t('form.descriptionLabel')}
        </Label>
        <Textarea
          id="feedback-description"
          rows={3}
          maxLength={2000}
          placeholder={t('form.descriptionPlaceholder')}
          {...register('description')}
        />
      </div>

      <Button type="submit" disabled={create.isPending} className="self-end">
        {create.isPending ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
