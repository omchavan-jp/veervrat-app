'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useWeakness } from '@/hooks/use-weaknesses';
import { useTest, useSaveAnswers } from '@/hooks/use-tests';
import { queryKeys } from '@/lib/api/query-keys';
import { Button } from '@/components/ui/button';

type Score = 1 | 2 | 3 | 4;
type ViewMode = 'one-at-a-time' | 'view-all';
type Sentence = { sentenceId: string; textEn: string; textMr: string | null };

const SCORE_LABELS: Record<Score, string> = { 4: 'Always', 3: 'Often', 2: 'Sometimes', 1: 'Never' };
const SCORE_MR: Record<Score, string> = { 4: 'नेहमी', 3: 'कधी कधी', 2: 'क्वचित', 1: 'कधीच नाही' };
const SCORE_COLORS: Record<Score, string> = {
  4: 'bg-success/20 border-success text-success',
  3: 'bg-accent-2/20 border-accent-2 text-accent-2',
  2: 'bg-warning/20 border-warning text-warning',
  1: 'bg-accent/20 border-accent text-accent',
};

export default function TestQuestionPage() {
  const { id, testId } = useParams<{ id: string; testId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: weakness } = useWeakness(id);
  const { data: testData } = useTest(testId);
  const saveAnswers = useSaveAnswers(testId);

  const [answers, setAnswersState] = useState<Map<string, Score>>(new Map());
  const answersRef = useRef<Map<string, Score>>(new Map());

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
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      // Allow clicks within the test flow itself
      if (!href || href.startsWith(`/study/${id}/test/${testId}`)) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavHref(href);
      setShowExitConfirm(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [id, testId]);

  // Warn on browser-level navigation (tab close, URL bar, reload)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const persistAnswers = useCallback((currentAnswers: Map<string, Score>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload = Array.from(currentAnswers.entries()).map(([sentenceId, score]) => ({ sentenceId, score }));
      if (payload.length > 0) saveAnswers.mutate(payload);
    }, 600);
  }, [saveAnswers]);

  const handleAnswer = (sentenceId: string, score: Score) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      if (next.get(sentenceId) === score) {
        next.delete(sentenceId);
      } else {
        next.set(sentenceId, score);
      }
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
      saveAnswers.mutate(payload, { onSettled: afterSave });
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

  if (!weakness || !testData || !hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-8">
      {/* Progress bar — sticky below the fixed header (header is fixed at top-0, h-14 = 56px) */}
      <div className="sticky top-14 z-10 border-b border-border bg-bg px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="flex-1">
            <div className="mb-1 text-[13px] text-muted">
              {respondedSentences}/{sentences.length} reflected on
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: sentences.length > 0 ? `${(respondedSentences / sentences.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'one-at-a-time' ? 'view-all' : 'one-at-a-time')}
            className="shrink-0 text-[12px] text-muted underline hover:text-fg"
          >
            {viewMode === 'one-at-a-time' ? 'View all' : 'One at a time'}
          </button>
          <button
            onClick={() => { setPendingNavHref(`/study/${id}`); setShowExitConfirm(true); }}
            className="shrink-0 text-[12px] text-muted hover:text-fg"
          >
            Save & exit
          </button>
        </div>
      </div>

      {/* Content — extra bottom padding so content isn't hidden behind fixed footer */}
      <div className="px-4 py-8 pb-52">
        <div className="mx-auto max-w-2xl">
          {viewMode === 'one-at-a-time' && current ? (
            <div>
              <div className="mb-2 font-mono text-[11px] text-muted">{currentIndex + 1} / {sentences.length}</div>
              <p className="font-display text-[22px] leading-snug tracking-tight">{current.textEn}</p>
              {current.textMr && <p className="mt-3 font-deva text-[17px] text-muted">{current.textMr}</p>}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {sentences.map((s, i) => (
                <div key={s.sentenceId} className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <button
                      onClick={() => { setCurrentIndex(i); setViewMode('one-at-a-time'); }}
                      className="mt-0.5 shrink-0 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent hover:bg-accent/20"
                      title="Open in single question mode"
                    >
                      #{i + 1}
                    </button>
                    <div className="flex-1">
                      <p className="text-[15px]">{s.textEn}</p>
                      {s.textMr && <p className="mt-1 font-deva text-[13px] text-muted">{s.textMr}</p>}
                    </div>
                    {answers.has(s.sentenceId) && (
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${SCORE_COLORS[answers.get(s.sentenceId)!]}`}>
                        {SCORE_LABELS[answers.get(s.sentenceId)!]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([4, 3, 2, 1] as Score[]).map((score) => (
                      <button
                        key={score}
                        onClick={() => handleAnswer(s.sentenceId, score)}
                        className={`rounded-lg border px-3 py-1.5 text-[13px] transition-all ${
                          answers.get(s.sentenceId) === score
                            ? SCORE_COLORS[score]
                            : 'border-border-strong bg-bg hover:border-accent/40'
                        }`}
                      >
                        {SCORE_LABELS[score]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom — always at screen bottom regardless of content height */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl space-y-3">
          {viewMode === 'one-at-a-time' && current && (
            <>
              <p className="text-center text-[11px] text-muted/50">Tap again to clear</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([4, 3, 2, 1] as Score[]).map((score) => (
                  <button
                    key={score}
                    onClick={() => handleAnswer(current.sentenceId, score)}
                    className={`rounded-xl border px-2 py-3 text-[13px] font-medium transition-all ${
                      answers.get(current.sentenceId) === score
                        ? SCORE_COLORS[score]
                        : 'border-border-strong bg-surface hover:border-accent/40'
                    }`}
                  >
                    <div>{SCORE_LABELS[score]}</div>
                    <div className="mt-0.5 font-deva text-[11px] opacity-70">{SCORE_MR[score]}</div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="rounded-xl bg-fg/8 px-5 py-2 text-[13px] font-medium hover:bg-fg/15 disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(sentences.length - 1, i + 1))}
                  disabled={currentIndex === sentences.length - 1}
                  className="rounded-xl bg-fg/8 px-5 py-2 text-[13px] font-medium hover:bg-fg/15 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </>
          )}
          <Button
            onClick={() => flushAndNavigate(`/study/${id}/test/${testId}/preview`)}
            disabled={respondedSentences === 0}
            className="h-auto w-full rounded-xl bg-accent px-6 py-3 text-[14px] text-bg hover:bg-accent-hover disabled:opacity-40"
          >
            {respondedSentences === sentences.length
              ? 'Review responses ✓'
              : `Review responses (${respondedSentences}/${sentences.length})`}
          </Button>
        </div>
      </div>

      {/* Exit confirm — shown for both in-app link clicks AND Save & exit button */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 px-4 pb-8 sm:items-center sm:pb-0">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-modal">
            <h3 className="mb-2 font-display text-[18px]">Leave the test?</h3>
            <p className="mb-6 text-[14px] text-muted">
              Your responses so far are saved. You can resume this test any time from the weakness page.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleExitConfirm(true)}
                className="w-full rounded-xl bg-accent px-4 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
              >
                Save & leave
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); setPendingNavHref(null); }}
                className="w-full rounded-xl border border-border-strong px-4 py-3 text-[14px] text-fg hover:bg-bg"
              >
                Continue reflecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
