'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, Check, X } from 'lucide-react';
import { invitationsApi } from '@/lib/api/invitations';
import { errorMessage } from '@/lib/api/error-message';

type Outcome = 'pending' | 'accepted' | 'declined' | 'error';

export default function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslations('invitation');
  const [outcome, setOutcome] = useState<Outcome>('pending');
  // An invitation fails for reasons the person can act on — it expired, it was already accepted,
  // it belongs to a different account. The API names which; showing a generic sentence instead
  // leaves them with a dead end and no idea whether to ask for a new invite.
  const [reason, setReason] = useState<string | null>(null);

  const fail = (err: unknown) => {
    setReason(errorMessage(err, t('errorBody')));
    setOutcome('error');
  };

  const accept = useMutation({
    mutationFn: () => invitationsApi.accept(token),
    onSuccess: () => setOutcome('accepted'),
    onError: fail,
  });
  const decline = useMutation({
    mutationFn: () => invitationsApi.decline(token),
    onSuccess: () => setOutcome('declined'),
    onError: fail,
  });

  const pending = accept.isPending || decline.isPending;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center text-center">
      {outcome === 'pending' && (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="font-display text-[26px] font-medium tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-[14px] text-muted">{t('body')}</p>
          <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              onClick={() => accept.mutate()}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg transition-transform hover:bg-accent-hover active:scale-95 disabled:opacity-50"
            >
              {accept.isPending ? t('accepting') : t('accept')}
            </button>
            <button
              onClick={() => decline.mutate()}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong px-6 py-3 text-[14px] transition-colors hover:border-accent disabled:opacity-50"
            >
              {decline.isPending ? t('declining') : t('decline')}
            </button>
          </div>
        </>
      )}

      {outcome === 'accepted' && (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success/12 text-success">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="font-display text-[26px] font-medium tracking-tight">
            {t('acceptedTitle')}
          </h1>
          <p className="mt-2 text-[14px] text-muted">{t('acceptedBody')}</p>
          <Link
            href="/my-vratmitras"
            className="mt-6 rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
          >
            {t('goToVratmitras')}
          </Link>
        </>
      )}

      {outcome === 'declined' && (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/15 text-muted">
            <X className="h-6 w-6" />
          </div>
          <h1 className="font-display text-[26px] font-medium tracking-tight">
            {t('declinedTitle')}
          </h1>
          <p className="mt-2 text-[14px] text-muted">{t('declinedBody')}</p>
          <Link
            href="/dashboard"
            className="mt-6 rounded-xl border border-border-strong px-6 py-3 text-[14px] hover:border-accent"
          >
            {t('goToDashboard')}
          </Link>
        </>
      )}

      {outcome === 'error' && (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger/12 text-danger">
            <X className="h-6 w-6" />
          </div>
          <h1 className="font-display text-[26px] font-medium tracking-tight">{t('errorTitle')}</h1>
          <p className="mt-2 text-[14px] text-muted">{reason ?? t('errorBody')}</p>
          <Link
            href="/dashboard"
            className="mt-6 rounded-xl border border-border-strong px-6 py-3 text-[14px] hover:border-accent"
          >
            {t('goToDashboard')}
          </Link>
        </>
      )}
    </div>
  );
}
