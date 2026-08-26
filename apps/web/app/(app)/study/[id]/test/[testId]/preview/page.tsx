'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useWeakness } from '@/hooks/use-weaknesses';
import { useTest, useSubmitTest } from '@/hooks/use-tests';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible';
import { BilingualText } from '@/components/shared/bilingual-text';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/error-message';

type Score = 1 | 2 | 3 | 4;
type Sentence = { sentenceId: string; textEn: string; textMr: string | null };

const SCORE_COLORS: Record<Score, string> = {
  4: 'text-success border-success/40 bg-success/10',
  3: 'text-accent-2 border-accent-2/40 bg-accent-2/10',
  2: 'text-warning border-warning/40 bg-warning/10',
  1: 'text-accent border-accent/40 bg-accent/10',
};

export default function TestPreviewPage() {
  const { id, testId } = useParams<{ id: string; testId: string }>();
  const router = useRouter();
  const t = useTranslations('study.preview');
  const tScore = useTranslations('study.report.score');
  const { toast } = useToast();
  const { data: weakness, isError: weaknessError, refetch: refetchWeakness } = useWeakness(id);
  const { data: testData, isError: testError, refetch: refetchTest } = useTest(testId);
  const submitTest = useSubmitTest();
  const [unansweredExpanded, setUnansweredExpanded] = useState(false);
  const [showUnansweredConfirm, setShowUnansweredConfirm] = useState(false);

  // If this test is already submitted, the preview (an edit-before-submit step) is
  // stale — send the user to the immutable report. Covers back/forward or a copied
  // preview URL opened after completion. Skip while our own submit is mid-flight so we
  // don't double-navigate (handleConfirm already routes to the report on success).
  useEffect(() => {
    if (testData && !testData.isDraft && !submitTest.isPending) {
      router.replace(`/study/${id}/test/${testId}/report`);
    }
  }, [testData, submitTest.isPending, id, testId, router]);

  const sentences: Sentence[] = (weakness?.subvirtues ?? []).flatMap((sv) => sv.sentences);

  // sentenceId -> global index, precomputed once so render-loop lookups are O(1)
  // and correct even if two sentence objects compare equal-by-reference.
  const indexById = new Map<string, number>(sentences.map((s, i) => [s.sentenceId, i]));

  const answerMap = new Map<string, Score>(
    (testData?.answers ?? []).map((a) => [a.sentenceId, a.score as Score]),
  );

  const answered = sentences.filter((s) => answerMap.has(s.sentenceId));
  const unanswered = sentences.filter((s) => !answerMap.has(s.sentenceId));

  const doSubmit = () => {
    setShowUnansweredConfirm(false);
    submitTest.mutate(testId, {
      onSuccess: () => router.push(`/study/${id}/test/${testId}/report`),
      onError: (err) =>
        toast({ title: errorMessage(err, t('submitError')), variant: 'destructive' }),
    });
  };

  // Submitting is final — there's no way back into a draft once it happens (confirmed:
  // markSubmitted is the only place isDraft ever becomes false). Nothing to lose when
  // everything's answered, but leaving sentences blank warrants an explicit "are you sure",
  // since testers were reaching the report page without realizing they'd just submitted.
  const handleConfirm = () => {
    if (unanswered.length > 0) {
      setShowUnansweredConfirm(true);
    } else {
      doSubmit();
    }
  };

  if (weaknessError || testError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Alert variant="destructive" className="max-w-sm">
          <AlertTitle>{t('loadError')}</AlertTitle>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (weaknessError) refetchWeakness();
                if (testError) refetchTest();
              }}
            >
              {t('retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!weakness || !testData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  return (
    // Self-contained column inside the shell content area: scrolling body + a footer
    // pinned to the column bottom (not the viewport), so nothing overlaps the sidebar.
    <div className="-mx-5 -mt-8 -mb-28 flex h-[calc(100dvh-60px)] flex-col md:-mx-10 md:-my-12 lg:-mx-16">
      {/* Content — the scrolling region. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 gap-1.5 px-2 text-[13px] text-muted hover:text-fg"
            onClick={() => router.push(`/study/${id}/test/${testId}`)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('editAnswers')}
          </Button>

          <h1 className="mb-1 font-display text-[28px] tracking-tight">{t('reviewTitle')}</h1>
          <p className="mb-6 text-[15px] text-muted">
            {t('reflectedCount', { answered: answered.length, total: sentences.length })}
            {unanswered.length > 0 && ` ${t('blankCount', { count: unanswered.length })}`}
          </p>

          {/* Answered — always expanded */}
          {answered.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {t('reflectedSection', { count: answered.length })}
              </h2>
              <div className="space-y-2">
                {answered.map((s) => {
                  const score = answerMap.get(s.sentenceId)!;
                  const globalIndex = indexById.get(s.sentenceId) ?? 0;
                  return (
                    <div
                      key={s.sentenceId}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                    >
                      <span className="shrink-0 font-mono text-[11px] text-muted">
                        {globalIndex + 1}
                      </span>
                      <BilingualText en={s.textEn} mr={s.textMr} size="sm" className="flex-1" />
                      <span
                        className={`shrink-0 rounded-full border px-3 py-0.5 text-[12px] font-medium ${SCORE_COLORS[score]}`}
                      >
                        {tScore(String(score))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Unanswered — collapsible */}
          {unanswered.length > 0 && (
            <Collapsible
              open={unansweredExpanded}
              onOpenChange={setUnansweredExpanded}
              className="mb-6"
            >
              <CollapsibleTrigger className="mb-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  {t('blankSection', { count: unanswered.length })}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                  {unansweredExpanded ? t('hide') : t('show')}
                  {unansweredExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
              </CollapsibleTrigger>
              <CollapsiblePanel>
                <div className="space-y-2">
                  {unanswered.map((s) => {
                    const globalIndex = indexById.get(s.sentenceId) ?? 0;
                    return (
                      <div
                        key={s.sentenceId}
                        className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 opacity-60"
                      >
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                          {globalIndex + 1}
                        </span>
                        <BilingualText en={s.textEn} mr={s.textMr} size="sm" className="flex-1" />
                        <span className="shrink-0 text-[13px] text-muted">{t('unanswered')}</span>
                      </div>
                    );
                  })}
                </div>
              </CollapsiblePanel>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Footer — pinned to the column bottom (not the viewport). Extra bottom padding
          on mobile clears the floating pill nav (fixed bottom-5); compact on md+. */}
      <div className="shrink-0 border-t border-border bg-bg px-4 pb-24 pt-3 md:pb-3">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button
            size="lg"
            className="h-auto flex-1 rounded-xl px-6 py-3.5 text-[15px]"
            disabled={submitTest.isPending || answered.length === 0}
            loading={submitTest.isPending}
            onClick={handleConfirm}
          >
            {t('completeReflection')}
          </Button>
          <Button
            variant="outline"
            className="h-auto rounded-xl border-border-strong bg-surface px-6 py-3.5 text-[15px] text-fg hover:bg-bg"
            onClick={() => router.push(`/study/${id}/test/${testId}`)}
          >
            {t('editAnswersShort')}
          </Button>
        </div>
      </div>

      <Dialog
        open={showUnansweredConfirm}
        onOpenChange={setShowUnansweredConfirm}
        title={t('unansweredConfirmTitle', { count: unanswered.length })}
        description={t('unansweredConfirmBody')}
      >
        <div className="space-y-2">
          <Button
            variant="outline"
            className="h-auto min-h-11 w-full rounded-xl border-border-strong py-3 text-[14px]"
            onClick={() => setShowUnansweredConfirm(false)}
          >
            {t('keepAnswering')}
          </Button>
          <Button
            size="lg"
            className="h-auto min-h-11 w-full rounded-xl py-3 text-[14px]"
            loading={submitTest.isPending}
            onClick={doSubmit}
          >
            {t('submitAnyway')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
