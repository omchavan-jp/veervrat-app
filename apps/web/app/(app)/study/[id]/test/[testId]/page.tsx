'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useWeakness } from '@/hooks/use-weaknesses';
import { useTest, useSaveAnswers } from '@/hooks/use-tests';
import { queryKeys } from '@/lib/api/query-keys';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BilingualText } from '@/components/shared/bilingual-text';
import { useToast } from '@/hooks/use-toast';

type Score = 1 | 2 | 3 | 4;
type ViewMode = 'one-at-a-time' | 'view-all';
type Sentence = { sentenceId: string; textEn: string; textMr: string | null };

const SCORE_KEYS: Record<Score, 'always' | 'often' | 'sometimes' | 'never'> = {
  4: 'always',
  3: 'often',
  2: 'sometimes',
  1: 'never',
};
// Read-only badge colours (non-interactive selected-answer pill).
const SCORE_COLORS: Record<Score, string> = {
  4: 'bg-success/20 border-success text-success',
  3: 'bg-accent-2/20 border-accent-2 text-accent-2',
  2: 'bg-warning/20 border-warning text-warning',
  1: 'bg-accent/20 border-accent text-accent',
};
// data-[pressed]: variants so they override the toggle primitive's default accent
// pressed styling (tailwind-merge dedupes against the same data-pressed keys), keeping
// the per-score semantic colour while selection is exposed via aria-pressed.
const SCORE_PRESSED_COLORS: Record<Score, string> = {
  4: 'data-[pressed]:bg-success/20 data-[pressed]:border-success data-[pressed]:text-success',
  3: 'data-[pressed]:bg-accent-2/20 data-[pressed]:border-accent-2 data-[pressed]:text-accent-2',
  2: 'data-[pressed]:bg-warning/20 data-[pressed]:border-warning data-[pressed]:text-warning',
  1: 'data-[pressed]:bg-accent/20 data-[pressed]:border-accent data-[pressed]:text-accent',
};

export default function TestQuestionPage() {
  const { id, testId } = useParams<{ id: string; testId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('study.test');
  const { toast } = useToast();
  const scoreLabel = (score: Score) => t(SCORE_KEYS[score]);

  const { data: weakness, isError: weaknessError, refetch: refetchWeakness } = useWeakness(id);
  const { data: testData, isError: testError, refetch: refetchTest } = useTest(testId);
  const saveAnswers = useSaveAnswers(testId);

  const [answers, setAnswersState] = useState<Map<string, Score>>(new Map());
  const answersRef = useRef<Map<string, Score>>(new Map());
  // Tracks unsaved edits so the navigation guards only fire when there is real work to
  // lose, not for the whole test lifetime. The ref mirrors the state so the always-on
  // popstate listener can read the live value without re-subscribing on every keystroke.
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  }, []);

  const setAnswers = useCallback((updater: (prev: Map<string, Score>) => Map<string, Score>) => {
    setAnswersState((prev) => {
      const next = updater(prev);
      answersRef.current = next;
      return next;
    });
  }, []);

  const [hydrated, setHydrated] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('one-at-a-time');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sentences: Sentence[] = (weakness?.subvirtues ?? []).flatMap(
    (sv) => sv.sentences,
  );

  // Redirect if already submitted
  useEffect(() => {
    if (testData && !testData.isDraft) {
      router.replace(`/study/${id}/test/${testId}/report`);
    }
  }, [testData, id, testId, router]);

  // Hydrate from server on first load
  useEffect(() => {
    if (testData && !hydrated) {
      const serverAnswers = new Map<string, Score>(
        (testData.answers ?? []).map((a) => [a.sentenceId, a.score as Score]),
      );
      answersRef.current = serverAnswers;
      setAnswersState(serverAnswers);
      setHydrated(true);
    }
  }, [testData, hydrated]);

  // Intercept ALL anchor clicks on the page (capture phase catches Next.js Link before router does)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Respect new-tab / non-primary interactions and clicks already handled.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      // Leave external / new-tab / download links to the browser.
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      // Allow clicks within the test flow itself.
      if (!href || href.startsWith(`/study/${id}/test/${testId}`)) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavHref(href);
      setShowExitConfirm(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [id, testId]);

  // Warn on browser-level navigation (tab close, URL bar, reload) only when there
  // are unsaved answers in a draft — not for the whole page lifetime.
  useEffect(() => {
    const isDraft = testData?.isDraft ?? false;
    if (!dirty || !isDraft) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, testData?.isDraft]);

  // Guard the browser Back / forward gesture (history popstate) consistently with the
  // refresh/close guard above: only intercept when there are UNSAVED edits. Answers
  // auto-save on a 600ms debounce, so once everything is persisted a Back should just
  // navigate cleanly (no contradictory "your responses are saved" prompt). When work is
  // genuinely unsaved, re-push our entry and raise the same exit-confirm dialog instead
  // of leaving the half-navigated state the user reported (back, options cleared, etc.).
  useEffect(() => {
    const isDraft = testData?.isDraft ?? false;
    if (!isDraft || !hydrated) return;
    // Seed a sentinel entry so the first Back lands on us, not the previous page.
    window.history.pushState({ testGuard: true }, '');
    const onPop = () => {
      if (!dirtyRef.current) {
        // Nothing to lose — allow the navigation to proceed naturally.
        window.history.back();
        return;
      }
      window.history.pushState({ testGuard: true }, '');
      setPendingNavHref(`/study/${id}`);
      setShowExitConfirm(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [testData?.isDraft, hydrated, id]);

  const persistAnswers = useCallback((currentAnswers: Map<string, Score>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload = Array.from(currentAnswers.entries()).map(([sentenceId, score]) => ({ sentenceId, score }));
      if (payload.length > 0) {
        saveAnswers.mutate(payload, {
          onSuccess: () => setDirty(false),
          onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
        });
      }
    }, 600);
  }, [saveAnswers, setDirty, toast, t]);

  // base-ui ToggleGroup is single-select: `group` is [] when the pressed score is
  // toggled off, or [scoreString] when a score is chosen — so it already encodes the
  // tap-to-clear behaviour the previous hand-rolled toggle implemented manually.
  const handleScoreSelect = (sentenceId: string, group: string[]) => {
    const selected = group.length > 0 ? (Number(group[0]) as Score) : null;
    setAnswers((prev) => {
      const next = new Map(prev);
      if (selected === null) {
        next.delete(sentenceId);
      } else {
        next.set(sentenceId, selected);
      }
      setDirty(true);
      persistAnswers(next);
      return next;
    });
  };

  const flushAndNavigate = (path: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const payload = Array.from(answersRef.current.entries()).map(([sentenceId, score]) => ({ sentenceId, score }));
    const afterSave = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tests.detail(testId) });
      router.push(path);
    };
    if (payload.length > 0) {
      saveAnswers.mutate(payload, {
        onSuccess: () => setDirty(false),
        onError: () => toast({ title: t('saveError'), variant: 'destructive' }),
        onSettled: afterSave,
      });
    } else {
      afterSave();
    }
  };

  const handleExitConfirm = (save: boolean) => {
    setShowExitConfirm(false);
    const dest = pendingNavHref ?? `/study/${id}`;
    setPendingNavHref(null);
    if (save) {
      flushAndNavigate(dest);
    } else {
      router.push(dest);
    }
  };

  const current = sentences[currentIndex];
  const respondedSentences = answers.size;

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

  if (!weakness || !testData || !hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  return (
    // Fill the shell's scrollable content area and own our own layout: a pinned header
    // and footer with a single scrolling region between them. The negative margins
    // cancel the shell's content padding (which is asymmetric on mobile: pb-28) so the
    // bars span the column — but only the column, never the sidebar. The middle region
    // scrolls; the bars never overlap the rail/toggles.
    <div className="-mx-5 -mt-8 -mb-28 flex h-[calc(100dvh-60px)] flex-col md:-mx-10 md:-my-12 lg:-mx-16">
      {/* Progress bar — pinned to the top of the test column. */}
      <div className="shrink-0 border-b border-border bg-bg px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="flex-1">
            <div className="mb-1 text-[13px] text-muted">
              {t('reflectedProgress', { answered: respondedSentences, total: sentences.length })}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: sentences.length > 0 ? `${(respondedSentences / sentences.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <Button
            variant="link"
            size="sm"
            className="shrink-0 px-0 text-[12px] text-muted underline hover:text-fg"
            onClick={() => setViewMode(viewMode === 'one-at-a-time' ? 'view-all' : 'one-at-a-time')}
          >
            {viewMode === 'one-at-a-time' ? t('viewAll') : t('oneAtATime')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-2 text-[12px] text-muted hover:text-fg"
            onClick={() => { setPendingNavHref(`/study/${id}`); setShowExitConfirm(true); }}
          >
            {t('saveExit')}
          </Button>
        </div>
      </div>

      {/* Content — the single scrolling region between the pinned bars. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {viewMode === 'one-at-a-time' && current ? (
            <div>
              <div className="mb-2 font-mono text-[11px] text-muted">{currentIndex + 1} / {sentences.length}</div>
              <BilingualText en={current.textEn} mr={current.textMr} size="lg" as="p" />
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {sentences.map((s, i) => (
                <div key={s.sentenceId} className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="mt-0.5 shrink-0 bg-accent/10 font-mono text-[11px] text-accent hover:bg-accent/20"
                      aria-label={t('focusSentence', { n: i + 1 })}
                      onClick={() => { setCurrentIndex(i); setViewMode('one-at-a-time'); }}
                    >
                      #{i + 1}
                    </Button>
                    <div className="flex-1">
                      <BilingualText en={s.textEn} mr={s.textMr} size="sm" />
                    </div>
                    {answers.has(s.sentenceId) && (
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${SCORE_COLORS[answers.get(s.sentenceId)!]}`}>
                        {scoreLabel(answers.get(s.sentenceId)!)}
                      </span>
                    )}
                  </div>
                  <ToggleGroup
                    value={answers.has(s.sentenceId) ? [String(answers.get(s.sentenceId))] : []}
                    onValueChange={(group) => handleScoreSelect(s.sentenceId, group)}
                    aria-label={t('scoreGroupLabel')}
                  >
                    {([4, 3, 2, 1] as Score[]).map((score) => (
                      <ToggleGroupItem
                        key={score}
                        size="sm"
                        value={String(score)}
                        className={SCORE_PRESSED_COLORS[score]}
                      >
                        {scoreLabel(score)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer — pinned to the bottom of the test column (not the viewport). Extra
          bottom padding on mobile clears the floating pill nav (fixed bottom-5); on
          md+ the rail replaces the pill nav so the footer stays compact. */}
      <div className="shrink-0 border-t border-border bg-bg px-4 pb-24 pt-3 md:pb-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {viewMode === 'one-at-a-time' && current && (
            <>
              <p className="text-center text-[11px] text-muted">{t('tapToClear')}</p>
              <ToggleGroup
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                value={answers.has(current.sentenceId) ? [String(answers.get(current.sentenceId))] : []}
                onValueChange={(group) => handleScoreSelect(current.sentenceId, group)}
                aria-label={t('scoreGroupLabel')}
              >
                {([4, 3, 2, 1] as Score[]).map((score) => (
                  <ToggleGroupItem
                    key={score}
                    value={String(score)}
                    className={`min-h-11 text-[13px] ${SCORE_PRESSED_COLORS[score]}`}
                  >
                    {scoreLabel(score)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  className="min-h-11 gap-1.5 px-5 text-[13px]"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t('previous')}
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11 gap-1.5 px-5 text-[13px]"
                  disabled={currentIndex === sentences.length - 1}
                  onClick={() => setCurrentIndex((i) => Math.min(sentences.length - 1, i + 1))}
                >
                  {t('next')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
          <Button
            size="lg"
            className="h-auto min-h-11 w-full rounded-xl px-6 py-3 text-[14px]"
            disabled={respondedSentences === 0 || saveAnswers.isPending}
            loading={saveAnswers.isPending}
            onClick={() => flushAndNavigate(`/study/${id}/test/${testId}/preview`)}
          >
            {respondedSentences === sentences.length
              ? t('reviewResponses')
              : t('reviewResponsesProgress', { answered: respondedSentences, total: sentences.length })}
          </Button>
        </div>
      </div>

      {/* Exit confirm — shown for both in-app link clicks AND Save & exit button */}
      <Dialog
        open={showExitConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowExitConfirm(false);
            setPendingNavHref(null);
          }
        }}
        title={t('exitTitle')}
        description={t('exitBody')}
      >
        <div className="space-y-2">
          <Button
            size="lg"
            className="h-auto min-h-11 w-full rounded-xl py-3 text-[14px]"
            onClick={() => handleExitConfirm(true)}
          >
            {t('saveLeave')}
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-11 w-full rounded-xl border-border-strong py-3 text-[14px]"
            onClick={() => { setShowExitConfirm(false); setPendingNavHref(null); }}
          >
            {t('continueReflecting')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
