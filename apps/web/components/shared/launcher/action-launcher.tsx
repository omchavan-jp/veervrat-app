'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, MessageSquareText, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRuntimeConfig } from '@/lib/runtime-config-provider';
import { FeedbackModal } from '@/components/shared/feedback/feedback-modal';
import { SuggestionMode } from '@/components/shared/suggestions/suggestion-mode';
import { FloatingLauncher, type LauncherAction } from './floating-launcher';

/**
 * The one floating affordance, and the single place that decides what a person may reach.
 *
 * ⚠️ Every check here is a **reflection** of what the API will allow, never the rule itself.
 * Until 2026-08-21 the feedback widget's flag was the only gate — set on the web tier while the
 * API admitted any authenticated user — so the button was hidden and the endpoint was open to
 * anyone who called it directly. Both actions below are enforced server-side; if the two ever
 * disagree, the API is right and this is the bug.
 */
export function ActionLauncher() {
  const t = useTranslations('launcher');
  const { feedbackMode } = useRuntimeConfig();
  const { user } = useAuth();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const grants = user?.grants ?? [];
  const canFeedback = feedbackMode !== 'off' && grants.includes('FEEDBACK_WIDGET');
  // No environment gate, deliberately: the grant is the whole rule, so there is no second switch
  // that can be left unset in infrastructure and silently disable this. See
  // capabilities.service.ts.
  const canSuggest = grants.includes('CONTENT_SUGGEST');

  const actions: LauncherAction[] = [
    ...(canFeedback
      ? [
          {
            key: 'feedback',
            label: t('reportProblem'),
            icon: <MessageSquarePlus className="h-4 w-4" />,
            onSelect: () => setFeedbackOpen(true),
          },
        ]
      : []),
    ...(canSuggest
      ? [
          {
            key: 'suggest',
            label: t('suggestContent'),
            icon: <MessageSquareText className="h-4 w-4" />,
            onSelect: () => setSuggesting(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <FloatingLauncher actions={actions} icon={<Sparkles className="h-5 w-5" aria-hidden />} />

      {canFeedback && <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />}

      {/* Mounted whenever the person may suggest, not only while picking: the pins marking their
          existing suggestions are drawn on every page load, which is the point of them. */}
      {canSuggest && <SuggestionMode active={suggesting} onExit={() => setSuggesting(false)} />}
    </>
  );
}
