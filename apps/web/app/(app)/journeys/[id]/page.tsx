'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useJourney, useUpdateJourneyState, useUpdateJourneyTitle, useCompleteJourney } from '@/hooks/use-journeys';
import type { JourneyState, ErcCounts } from '@/lib/api/journeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ExposuresTab } from '@/components/journey/exposures-tab';
import { ResolutionsTab } from '@/components/journey/resolutions-tab';
import { ChallengesTab } from '@/components/journey/challenges-tab';
import { BilingualText } from '@/components/shared/bilingual-text';
import { JourneyActivityFeed } from '@/components/journey/journey-activity-feed';

const STATE_COLORS: Record<JourneyState, string> = {
  NOT_STARTED: 'text-muted bg-muted/10',
  ACTIVE: 'text-accent-2 bg-accent-2/10',
  PAUSED: 'text-warning bg-warning/10',
  DORMANT: 'text-muted bg-muted/10',
  COMPLETED: 'text-success bg-success/10',
};

type Tab = 'overview' | 'exposures' | 'resolutions' | 'challenges' | 'chat';

function ErcCard({ label, counts }: { label: string; counts: ErcCounts }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{label}</h3>
      <div className="flex gap-4">
        <div className="text-center">
          <div className="font-mono text-[22px] font-medium">{counts.total}</div>
          <div className="text-[11px] text-muted">Total</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[22px] font-medium text-accent-2">{counts.active}</div>
          <div className="text-[11px] text-muted">Active</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[22px] font-medium text-success">{counts.approved}</div>
          <div className="text-[11px] text-muted">Done</div>
        </div>
      </div>
    </div>
  );
}

export default function JourneyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('journey');
  const { data: journey, isLoading } = useJourney(id);
  const updateState = useUpdateJourneyState();
  const updateTitle = useUpdateJourneyTitle();
  const completeJourney = useCompleteJourney();
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flush pending title save on unmount so navigation doesn't lose the edit
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false);
    if (!titleValue.trim() || titleValue === journey?.title) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Fire immediately on blur — no need to debounce, blur only fires once
    updateTitle.mutate({ id, title: titleValue.trim() });
  }, [id, titleValue, journey?.title, updateTitle]);

  if (isLoading || !journey) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Viewer is the journey's VM (global or an active journey assignment) and not the owner.
  const isOwner = !!user && journey.vratarthiId === user.id;
  const viewerIsVm =
    !!user &&
    !isOwner &&
    (journey.globalVmRelationship?.vmId === user.id ||
      journey.vmAssignments.some((a) => a.vmId === user.id && a.state === 'ACTIVE'));

  const canPause = journey.state === 'ACTIVE';
  const canResume = journey.state === 'PAUSED' || journey.state === 'DORMANT';
  const isEmpty =
    journey.ercCounts.exposures.total === 0 &&
    journey.ercCounts.resolutions.total === 0 &&
    journey.ercCounts.challenges.total === 0;

  // Completion is offered on an active journey that has at least one approved item.
  const approvedCount =
    journey.ercCounts.exposures.approved +
    journey.ercCounts.resolutions.approved +
    journey.ercCounts.challenges.approved;
  const canComplete = journey.state === 'ACTIVE' && approvedCount > 0;

  const handleComplete = () => {
    completeJourney.mutate(
      { id },
      {
        onSuccess: () => toast({ title: t('detail.completeSuccess') }),
        onError: (e) =>
          toast({
            title: t('detail.completeError'),
            description: e instanceof Error ? e.message : undefined,
            variant: 'destructive',
          }),
      },
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('detail.tabOverview') },
    { key: 'exposures', label: t('detail.tabExposures') },
    { key: 'resolutions', label: t('detail.tabResolutions') },
    { key: 'challenges', label: t('detail.tabChallenges') },
    { key: 'chat', label: t('detail.tabChat') },
  ];

  return (
    // -mx-4 -mt-8 lets the shell break out of the layout padding for a full-width feel
    <div className="-mx-4 -mt-8">
      {/* Journey shell header */}
      <div className="border-b border-border bg-bg px-4 py-5">
        <div className="mx-auto max-w-4xl">
          <div className="mb-1">
            <Link href="/journeys" className="text-[12px] text-muted hover:text-fg">← Journeys</Link>
          </div>

          {/* Title — editable inline */}
          <div className="mb-2 flex items-start gap-3">
            {editingTitle ? (
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="flex-1 rounded-none border-0 border-b border-accent bg-transparent font-display text-[clamp(20px,2.5vw,30px)] tracking-tight focus:outline-none"
              />
            ) : (
              <button
                onClick={() => { setTitleValue(journey.title); setEditingTitle(true); }}
                className="flex-1 text-left font-display text-[clamp(20px,2.5vw,30px)] tracking-tight hover:opacity-70"
                title="Click to edit title"
              >
                {journey.title}
              </button>
            )}
            <span className={`mt-1 shrink-0 rounded-full px-3 py-0.5 text-[12px] font-medium ${STATE_COLORS[journey.state]}`}>
              {t(`stateBadge.${journey.state.toLowerCase()}`)}
            </span>
          </div>

          {/* Sentence context */}
          <BilingualText en={journey.sentence.textEn} mr={journey.sentence.textMr} size="md" as="p" className="mb-2" />
          <p className="mb-3 text-[13px] text-accent-2">
            {t('detail.cultivating', {
              subvirtue: journey.sentence.subvirtue.nameMr ?? journey.sentence.subvirtue.nameEn,
              virtue: journey.sentence.subvirtue.virtue.nameMr ?? journey.sentence.subvirtue.virtue.nameEn,
            })}
          </p>

          {/* Weakness tags */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {journey.weaknesses.map((w) => (
              <span
                key={w.id}
                className={`rounded-full border border-border px-2 py-0.5 text-[11px] text-muted ${w.nameMr ? 'font-deva' : ''}`}
              >
                {w.nameMr ?? w.nameEn}
              </span>
            ))}
          </div>

          {/* VM + actions */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-muted">
              {journey.globalVmRelationship ? 'VM assigned' : t('detail.noVm')}
            </span>
            {canPause && (
              <button
                onClick={() => updateState.mutate({ id, action: 'pause' })}
                disabled={updateState.isPending}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-[12px] hover:bg-bg disabled:opacity-40"
              >
                {t('detail.pause')}
              </button>
            )}
            {canResume && (
              <button
                onClick={() => updateState.mutate({ id, action: 'resume' })}
                disabled={updateState.isPending}
                className="rounded-lg bg-accent-2/10 px-3 py-1.5 text-[12px] text-accent-2 hover:bg-accent-2/20 disabled:opacity-40"
              >
                {t('detail.resume')}
              </button>
            )}
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={completeJourney.isPending}
                className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-bg transition-transform hover:bg-accent-hover active:scale-95 disabled:opacity-40"
              >
                {completeJourney.isPending ? '…' : t('detail.complete')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border bg-bg px-4">
        <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-accent text-fg'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {activeTab === 'overview' && (
          isEmpty ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="mb-4 text-[15px] text-muted">{t('detail.emptyState')}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setActiveTab('exposures')}
                  className="rounded-xl bg-accent px-5 py-2.5 text-[14px] font-medium text-bg hover:bg-accent-hover"
                >
                  {t('detail.tabExposures')}
                </button>
                <button
                  onClick={() => setActiveTab('resolutions')}
                  className="rounded-xl border border-border-strong bg-surface px-5 py-2.5 text-[14px] hover:bg-bg"
                >
                  {t('detail.tabResolutions')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <ErcCard label={t('detail.tabExposures')} counts={journey.ercCounts.exposures} />
                <ErcCard label={t('detail.tabResolutions')} counts={journey.ercCounts.resolutions} />
                <ErcCard label={t('detail.tabChallenges')} counts={journey.ercCounts.challenges} />
              </div>
              <JourneyActivityFeed journeyId={journey.id} />
            </div>
          )
        )}

        {activeTab === 'exposures' && (
          <ExposuresTab journeyId={journey.id} hasVm={!!journey.globalVmRelationship} viewerIsVm={viewerIsVm} />
        )}
        {activeTab === 'resolutions' && (
          <ResolutionsTab journeyId={journey.id} hasVm={!!journey.globalVmRelationship} viewerIsVm={viewerIsVm} />
        )}
        {activeTab === 'challenges' && (
          <ChallengesTab journeyId={journey.id} hasVm={!!journey.globalVmRelationship} viewerIsVm={viewerIsVm} />
        )}
        {activeTab === 'chat' && (() => {
          const vmId =
            journey.globalVmRelationship?.vmId ??
            journey.vmAssignments.find((a) => a.state === 'ACTIVE')?.vmId ??
            null;
          return vmId ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <p className="mb-4 text-[14px] text-muted">{t('detail.chatBanner', { title: journey.title })}</p>
              <Link
                href={`/my-vratmitras/${vmId}/chat`}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[14px] font-medium text-bg transition-transform hover:bg-accent-hover active:scale-95"
              >
                {t('detail.openChat')}
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="text-[14px] text-muted">{t('detail.chatNoVm')}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
