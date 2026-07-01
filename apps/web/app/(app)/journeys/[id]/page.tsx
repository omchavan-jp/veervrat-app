'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { useJourney, useUpdateJourneyState, useUpdateJourneyTitle, useCompleteJourney } from '@/hooks/use-journeys';
import type { JourneyState, ErcCounts } from '@/lib/api/journeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs } from '@/components/ui/tabs';
import { ExposuresTab } from '@/components/journey/exposures-tab';
import { ResolutionsTab } from '@/components/journey/resolutions-tab';
import { ChallengesTab } from '@/components/journey/challenges-tab';
import { BilingualText, ContentText } from '@/components/shared/bilingual-text';
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
  const t = useTranslations('journey');
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{label}</h3>
      <div className="flex gap-4">
        <div className="text-center">
          <div className="font-mono text-[22px] font-medium">{counts.total}</div>
          <div className="text-[11px] text-muted">{t('detail.countTotal')}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[22px] font-medium text-accent-2">{counts.active}</div>
          <div className="text-[11px] text-muted">{t('detail.countActive')}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[22px] font-medium text-success">{counts.approved}</div>
          <div className="text-[11px] text-muted">{t('detail.countDone')}</div>
        </div>
      </div>
    </div>
  );
}

export default function JourneyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('journey');
  const locale = useLocale();
  // Pick the active-locale content value, falling back to the other script when the
  // preferred one is missing (content is sometimes English-only).
  const pick = (en: string, mr?: string | null) => (locale === 'mr' && mr ? mr : en);
  const { data: journey, isLoading, isError, refetch } = useJourney(id);
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

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  // An error or a missing journey must read distinctly from the loading spinner so a
  // failure never collapses into an infinite spin.
  if (isError) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertTitle className="text-destructive">{t('detail.loadError')}</AlertTitle>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => refetch()}>{t('detail.retry')}</Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Alert>
          <AlertTitle>{t('detail.notFoundTitle')}</AlertTitle>
          <AlertDescription>{t('detail.notFoundBody')}</AlertDescription>
          <div className="mt-3">
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/journeys" />}>
              {t('detail.backToJourneys')}
            </Button>
          </div>
        </Alert>
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
            <Link href="/journeys" className="inline-flex items-center gap-0.5 text-[12px] text-muted hover:text-fg">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('detail.backToJourneys')}
            </Link>
          </div>

          {/* Title — editable inline */}
          <div className="mb-2 flex items-start gap-3">
            {editingTitle ? (
              <Input
                autoFocus
                variant="underline"
                aria-label={t('detail.titleLabel')}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="flex-1 border-b-accent py-0 font-display text-[clamp(26px,3vw,36px)] tracking-tight"
              />
            ) : (
              <Button
                variant="ghost"
                onClick={() => { setTitleValue(journey.title); setEditingTitle(true); }}
                title={t('detail.editTitleHint')}
                className="h-auto flex-1 justify-start px-0 text-left font-display text-[clamp(26px,3vw,36px)] font-normal tracking-tight hover:bg-transparent hover:opacity-70"
              >
                {journey.title}
              </Button>
            )}
            <span className={`mt-1 shrink-0 rounded-full px-3 py-0.5 text-[12px] font-medium ${STATE_COLORS[journey.state]}`}>
              {t(`stateBadge.${journey.state.toLowerCase()}`)}
            </span>
          </div>

          {/* Sentence context */}
          <BilingualText en={journey.sentence.textEn} mr={journey.sentence.textMr} size="md" as="p" className="mb-2" />
          <p className="mb-3 text-[13px] text-accent-2">
            {t('detail.cultivating', {
              subvirtue: pick(journey.sentence.subvirtue.nameEn, journey.sentence.subvirtue.nameMr),
              virtue: pick(journey.sentence.subvirtue.virtue.nameEn, journey.sentence.subvirtue.virtue.nameMr),
            })}
          </p>

          {/* Weakness tags */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {journey.weaknesses.map((w) => (
              <ContentText
                key={w.id}
                en={w.nameEn}
                mr={w.nameMr}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
              />
            ))}
          </div>

          {/* VM + actions */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-muted">
              {journey.globalVmRelationship ? t('detail.vmAssigned') : t('detail.noVm')}
            </span>
            {canPause && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateState.mutate({ id, action: 'pause' })}
                disabled={updateState.isPending}
                className="border-border-strong px-3 py-1.5 text-[12px] hover:bg-bg"
              >
                {t('detail.pause')}
              </Button>
            )}
            {canResume && (
              <Button
                size="sm"
                onClick={() => updateState.mutate({ id, action: 'resume' })}
                disabled={updateState.isPending}
                className="bg-accent-2/10 px-3 py-1.5 text-[12px] text-accent-2 hover:bg-accent-2/20"
              >
                {t('detail.resume')}
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                onClick={handleComplete}
                loading={completeJourney.isPending}
                disabled={completeJourney.isPending}
                className="bg-accent px-3 py-1.5 text-[12px] font-medium text-bg hover:bg-accent-hover"
              >
                {t('detail.complete')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border bg-bg px-4">
        <Tabs
          className="mx-auto max-w-4xl border-b-0"
          items={tabs}
          active={activeTab}
          onChange={(key) => setActiveTab(key as Tab)}
        />
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {activeTab === 'overview' && (
          isEmpty ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <p className="mb-4 text-[15px] text-muted">{t('detail.emptyState')}</p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setActiveTab('exposures')}
                  className="h-auto bg-accent px-5 py-2.5 text-[14px] font-medium text-bg hover:bg-accent-hover"
                >
                  {t('detail.tabExposures')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('resolutions')}
                  className="h-auto border-border-strong bg-surface px-5 py-2.5 text-[14px] hover:bg-bg"
                >
                  {t('detail.tabResolutions')}
                </Button>
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
              <div className="flex justify-center">
                <Link
                  href={`/experiences/new?journeyId=${journey.id}`}
                  className="rounded-full border border-border-strong px-4 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-fg"
                >
                  {t('detail.logExperience')}
                </Link>
              </div>
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
              <Button
                nativeButton={false}
                render={<Link href={`/my-vratmitras/${vmId}/chat`} />}
                className="h-auto bg-accent px-5 py-2.5 text-[14px] font-medium text-bg hover:bg-accent-hover"
              >
                {t('detail.openChat')}
              </Button>
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
