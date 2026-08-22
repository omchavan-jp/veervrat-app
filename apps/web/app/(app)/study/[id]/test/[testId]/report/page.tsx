'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useTestReport } from '@/hooks/use-tests';
import type { ReportSentence } from '@/lib/api/tests';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle } from '@/components/ui/alert';

const SCORE_COLORS: Record<number, string> = {
  4: 'bg-success/15 text-success border-success/30',
  3: 'bg-accent-2/15 text-accent-2 border-accent-2/30',
  2: 'bg-warning/15 text-warning border-warning/30',
  1: 'bg-accent/15 text-accent border-accent/30',
};

// Cap the entrance stagger so a long list doesn't cascade for seconds — keeps the
// motion calm per the design north-star.
const STAGGER_CAP = 6;
const STAGGER_STEP = 0.06;

function SentenceCard({
  sentence,
  index,
  weaknessId,
}: {
  sentence: ReportSentence;
  index: number;
  weaknessId: string;
}) {
  const t = useTranslations('study.report');
  const tScore = useTranslations('study.report.score');
  const reduceMotion = useReducedMotion();
  const delay = reduceMotion ? 0 : Math.min(index, STAGGER_CAP) * STAGGER_STEP;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <BilingualText en={sentence.textEn} mr={sentence.textMr} size="sm" />
        </div>
        {sentence.score !== null && (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium ${SCORE_COLORS[sentence.score] ?? ''}`}
          >
            {tScore(String(sentence.score))}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
          <ContentText en={sentence.subvirtueNameEn} mr={sentence.subvirtueNameMr} />
          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <ContentText en={sentence.virtueNameEn} mr={sentence.virtueNameMr} />
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
  const format = useFormatter();
  const { data: report, isLoading, isError, refetch } = useTestReport(testId);
  const [otherExpanded, setOtherExpanded] = useState(false);

  const backLink = (
    <Link
      href={`/study/${id}`}
      className="mb-6 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t('backToWeakness')}
    </Link>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label={t('loading')} />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="py-8">
        <div className="mx-auto max-w-2xl">
          {backLink}
          <Alert variant="destructive" className="max-w-sm">
            <AlertTitle>{t('loadError')}</AlertTitle>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                {t('retry')}
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {backLink}

          <BilingualText
            en={report.weaknessNameEn}
            mr={report.weaknessNameMr}
            size="xl"
            as="h1"
            className="mb-1"
          />
          <p className="mb-6 text-[13px] text-muted">
            {t('reflectedMeta', {
              answered: report.answeredCount,
              total: report.totalSentences,
              date: format.dateTime(new Date(report.submittedAt), { dateStyle: 'medium' }),
            })}
          </p>

          {/* Virtues to explore */}
          {report.virtuesToExplore.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {t('virtuesTitle')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {report.virtuesToExplore.map((v) => (
                  <ContentText
                    key={v.virtueId}
                    en={v.virtueNameEn}
                    mr={v.virtueNameMr}
                    className="rounded-full bg-accent-2/10 px-4 py-1.5 text-[13px] font-medium text-accent-2"
                  />
                ))}
              </div>
            </motion.section>
          )}

          {/* Flagged sentences */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="mb-1 font-display text-[20px] tracking-tight">{t('flaggedTitle')}</h2>
            <p className="mb-4 text-[14px] text-muted">{t('flaggedSubtitle')}</p>
            {report.flaggedSentences.length === 0 ? (
              <p className="text-[14px] text-muted">{t('noFlagged')}</p>
            ) : (
              <div className="space-y-3">
                {report.flaggedSentences.map((s, i) => (
                  <SentenceCard
                    key={s.sentenceId}
                    sentence={s}
                    index={i}
                    weaknessId={report.weaknessId}
                  />
                ))}
              </div>
            )}
          </motion.section>

          {/* Other sentences collapsible */}
          {report.otherSentences.length > 0 && (
            <section className="mb-8">
              <Button
                variant="outline"
                className="mb-4 h-auto w-full justify-between rounded-xl border-border px-4 py-3 text-[14px] font-normal"
                aria-expanded={otherExpanded}
                aria-controls="report-other-sentences"
                onClick={() => setOtherExpanded((v) => !v)}
              >
                <span className="text-muted">
                  {t('otherToggle', { count: report.otherSentences.length })}
                </span>
                {otherExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
                )}
              </Button>
              <AnimatePresence>
                {otherExpanded && (
                  <motion.div
                    id="report-other-sentences"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {report.otherSentences.map((s, i) => (
                      <SentenceCard
                        key={s.sentenceId}
                        sentence={s}
                        index={i}
                        weaknessId={report.weaknessId}
                      />
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
