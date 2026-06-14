'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWeakness } from '@/hooks/use-weaknesses';
import { useTest, useSubmitTest } from '@/hooks/use-tests';
import { Button } from '@/components/ui/button';
import { BilingualText } from '@/components/shared/bilingual-text';

type Score = 1 | 2 | 3 | 4;
type Sentence = { sentenceId: string; textEn: string; textMr: string | null };

const SCORE_LABELS: Record<Score, string> = { 4: 'Always', 3: 'Often', 2: 'Sometimes', 1: 'Never' };
const SCORE_COLORS: Record<Score, string> = {
  4: 'text-success border-success/40 bg-success/10',
  3: 'text-accent-2 border-accent-2/40 bg-accent-2/10',
  2: 'text-warning border-warning/40 bg-warning/10',
  1: 'text-accent border-accent/40 bg-accent/10',
};

export default function TestPreviewPage() {
  const { id, testId } = useParams<{ id: string; testId: string }>();
  const router = useRouter();
  const { data: weakness } = useWeakness(id);
  const { data: testData } = useTest(testId);
  const submitTest = useSubmitTest();
  const [unansweredExpanded, setUnansweredExpanded] = useState(false);

  const sentences: Sentence[] = (weakness?.subvirtues ?? []).flatMap(
    (sv) => sv.sentences,
  );

  const answerMap = new Map<string, Score>(
    (testData?.answers ?? []).map((a) => [a.sentenceId, a.score as Score]),
  );

  const answered = sentences.filter((s) => answerMap.has(s.sentenceId));
  const unanswered = sentences.filter((s) => !answerMap.has(s.sentenceId));

  const handleConfirm = () => {
    submitTest.mutate(testId, {
      onSuccess: () => router.push(`/study/${id}/test/${testId}/report`),
    });
  };

  if (!weakness || !testData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-8">
      {/* Content */}
      <div className="px-4 pb-28 pt-8">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.push(`/study/${id}/test/${testId}`)}
            className="mb-6 text-[13px] text-muted hover:text-fg"
          >
            ← Edit answers
          </button>

          <h1 className="mb-1 font-display text-[28px] tracking-tight">Review your responses</h1>
          <p className="mb-6 text-[15px] text-muted">
            {answered.length} of {sentences.length} reflected on.
            {unanswered.length > 0 && ` ${unanswered.length} left blank.`}
          </p>

          {/* Answered — always expanded */}
          {answered.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Reflected on ({answered.length})
              </h2>
              <div className="space-y-2">
                {answered.map((s, i) => {
                  const score = answerMap.get(s.sentenceId)!;
                  const globalIndex = sentences.indexOf(s);
                  return (
                    <div key={s.sentenceId} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                      <span className="shrink-0 font-mono text-[11px] text-muted">{globalIndex + 1}</span>
                      <BilingualText en={s.textEn} mr={s.textMr} size="sm" className="flex-1" />
                      <span className={`shrink-0 rounded-full border px-3 py-0.5 text-[12px] font-medium ${SCORE_COLORS[score]}`}>
                        {SCORE_LABELS[score]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Unanswered — collapsible */}
          {unanswered.length > 0 && (
            <section className="mb-6">
              <button
                onClick={() => setUnansweredExpanded((v) => !v)}
                className="mb-3 flex w-full items-center justify-between"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  Left blank ({unanswered.length})
                </span>
                <span className="text-[12px] text-muted">{unansweredExpanded ? '↑ Hide' : '↓ Show'}</span>
              </button>
              {unansweredExpanded && (
                <div className="space-y-2">
                  {unanswered.map((s) => {
                    const globalIndex = sentences.indexOf(s);
                    return (
                      <div key={s.sentenceId} className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 opacity-50">
                        <span className="shrink-0 font-mono text-[11px] text-muted">{globalIndex + 1}</span>
                        <BilingualText en={s.textEn} mr={s.textMr} size="sm" className="flex-1" />
                        <span className="shrink-0 text-[13px] text-muted/50">—</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-bg px-4 py-3 z-10">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button
            onClick={handleConfirm}
            disabled={submitTest.isPending || answered.length === 0}
            className="h-auto flex-1 rounded-xl bg-accent px-6 py-3.5 text-[15px] text-bg hover:bg-accent-hover disabled:opacity-40"
          >
            {submitTest.isPending ? 'Completing…' : 'Complete reflection'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/study/${id}/test/${testId}`)}
            className="h-auto rounded-xl border-border-strong bg-surface px-6 py-3.5 text-[15px] text-fg hover:bg-bg"
          >
            Edit answers
          </Button>
        </div>
      </div>
    </div>
  );
}
