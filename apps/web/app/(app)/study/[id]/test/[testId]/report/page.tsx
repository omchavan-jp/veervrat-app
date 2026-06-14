'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useTestReport } from '@/hooks/use-tests';
import type { ReportSentence } from '@/lib/api/tests';
import { BilingualText } from '@/components/shared/bilingual-text';

const SCORE_LABELS: Record<number, string> = { 4: 'Always', 3: 'Often', 2: 'Sometimes', 1: 'Never' };
const SCORE_COLORS: Record<number, string> = {
  4: 'bg-success/15 text-success border-success/30',
  3: 'bg-accent-2/15 text-accent-2 border-accent-2/30',
  2: 'bg-warning/15 text-warning border-warning/30',
  1: 'bg-accent/15 text-accent border-accent/30',
};

function SentenceCard({ sentence, index, weaknessId }: { sentence: ReportSentence; index: number; weaknessId: string }) {
  const t = useTranslations('study.report');
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <BilingualText en={sentence.textEn} mr={sentence.textMr} size="sm" />
        </div>
        {sentence.score !== null && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium ${SCORE_COLORS[sentence.score] ?? ''}`}>
            {SCORE_LABELS[sentence.score] ?? sentence.score}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted">
          <span className={sentence.subvirtueNameMr ? 'font-deva' : undefined}>
            {sentence.subvirtueNameMr ?? sentence.subvirtueNameEn}
          </span>
          {' → '}
          <span className={sentence.virtueNameMr ? 'font-deva' : undefined}>
            {sentence.virtueNameMr ?? sentence.virtueNameEn}
          </span>
        </span>
        <Link
          href={`/journeys/new?sentenceId=${sentence.sentenceId}&weaknessId=${weaknessId}`}
          className="text-[13px] text-accent underline decoration-accent/40 hover:no-underline"
        >
          {t('startJourney')}
        </Link>
      </div>
    </motion.div>
  );
}

export default function TestReportPage() {
  const { id, testId } = useParams<{ id: string; testId: string }>();
  const t = useTranslations('study.report');
  const { data: report, isLoading } = useTestReport(testId);
  const [otherExpanded, setOtherExpanded] = useState(false);

  if (isLoading || !report) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Link href={`/study/${id}`} className="mb-6 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">
            ← {t('backToWeakness')}
          </Link>

          <BilingualText
            en={report.weaknessNameEn}
            mr={report.weaknessNameMr}
            size="xl"
            as="h1"
            className="mb-1"
          />
          <p className="mb-6 text-[13px] text-muted">
            {report.answeredCount}/{report.totalSentences} reflected on · {new Date(report.submittedAt).toLocaleDateString()}
          </p>

          {/* Virtues to explore */}
          {report.virtuesToExplore.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{t('virtuesTitle')}</h2>
              <div className="flex flex-wrap gap-2">
                {report.virtuesToExplore.map((v) => (
                  <span
                    key={v.virtueId}
                    className={`rounded-full bg-accent-2/10 px-4 py-1.5 text-[13px] font-medium text-accent-2 ${v.virtueNameMr ? 'font-deva' : ''}`}
                  >
                    {v.virtueNameMr ?? v.virtueNameEn}
                  </span>
                ))}
              </div>
            </motion.section>
          )}

          {/* Flagged sentences */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
            <h2 className="mb-1 font-display text-[20px] tracking-tight">{t('flaggedTitle')}</h2>
            <p className="mb-4 text-[14px] text-muted">{t('flaggedSubtitle')}</p>
            {report.flaggedSentences.length === 0 ? (
              <p className="text-[14px] text-muted">{t('noFlagged')}</p>
            ) : (
              <div className="space-y-3">
                {report.flaggedSentences.map((s, i) => (
                  <SentenceCard key={s.sentenceId} sentence={s} index={i} weaknessId={report.weaknessId} />
                ))}
              </div>
            )}
          </motion.section>

          {/* Other sentences collapsible */}
          {report.otherSentences.length > 0 && (
            <section className="mb-8">
              <button
                onClick={() => setOtherExpanded((v) => !v)}
                className="mb-4 flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-[14px] hover:bg-bg"
              >
                <span className="text-muted">{t('otherToggle', { count: report.otherSentences.length })}</span>
                <span className="text-muted">{otherExpanded ? '↑' : '↓'}</span>
              </button>
              <AnimatePresence>
                {otherExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {report.otherSentences.map((s, i) => (
                      <SentenceCard key={s.sentenceId} sentence={s} index={i} weaknessId={report.weaknessId} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </motion.div>
      </div>
    </div>
  );
}
