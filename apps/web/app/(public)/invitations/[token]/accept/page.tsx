'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UserPlus, Check, X } from 'lucide-react';
import { invitationsApi } from '@/lib/api/invitations';
import { useAuth } from '@/hooks/use-auth';
import { errorMessage } from '@/lib/api/error-message';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';

type Outcome = 'pending' | 'accepted' | 'declined' | 'error';

export default function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslations('invitation');
  const { isAuthenticated } = useAuth();
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

  /**
   * Who is asking.
   *
   * This page used to fetch nothing: it rendered static copy and two buttons, so it looked
   * identical for a valid invitation, an expired one, and one already used — and it never said
   * who had sent it (#222). Accepting gives that person read access to your journeys, weaknesses
   * and reflections; nobody should agree to that without a name.
   *
   * Readable without a session, because whoever holds the link may not have an account yet.
   */
  const {
    data: invitation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationsApi.byToken(token),
    retry: false,
  });

  const pending = accept.isPending || decline.isPending;
  // Told BEFORE being offered a choice, rather than on click.
  const unusable = isError || (invitation?.status !== undefined && invitation.status !== 'PENDING');

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[460px] flex-col items-center justify-center text-center">
      {outcome === 'pending' && isLoading && <Spinner size="lg" label={t('title')} />}

      {outcome === 'pending' && !isLoading && unusable && (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted/15 text-muted">
            <X className="h-6 w-6" />
          </div>
          <h1 className="font-display text-[26px] font-medium tracking-tight">{t('errorTitle')}</h1>
          <p className="mt-2 text-[14px] text-muted">{t('errorBody')}</p>
          <Link
            href="/invitations"
            className="mt-6 rounded-xl border border-border-strong px-6 py-3 text-[14px] hover:border-accent"
          >
            {t('goToInvitations')}
          </Link>
        </>
      )}

      {outcome === 'pending' && !isLoading && !unusable && (
        <>
          {invitation ? (
            <Avatar className="mb-5 h-14 w-14">
              {invitation.inviter.avatarUrl && <AvatarImage src={invitation.inviter.avatarUrl} />}
              <AvatarFallback>
                {invitation.inviter.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
              <UserPlus className="h-6 w-6" />
            </div>
          )}
          <h1 className="font-display text-[26px] font-medium tracking-tight">{t('title')}</h1>
          {invitation ? (
            <p className="mt-2 text-[14px] text-muted">
              {t.rich('bodyFrom', {
                name: () => (
                  <Link
                    href={`/u/${invitation.inviter.username}`}
                    className="text-accent underline decoration-accent/40 underline-offset-2 hover:no-underline"
                  >
                    {invitation.inviter.displayName}
                  </Link>
                ),
              })}
            </p>
          ) : (
            <p className="mt-2 text-[14px] text-muted">{t('body')}</p>
          )}
          {/* Accepting is what needs a session; reading who invited you is not. Somebody without
              an account is sent to sign up and returned here, rather than being shown two buttons
              that cannot work — or, as before, a login form with no idea what it was for. */}
          {isAuthenticated ? (
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
          ) : (
            <div className="mt-7 flex w-full flex-col items-center gap-2.5">
              {/* Says what will actually happen. `?next=` is not honoured by login or signup, so
                  promising a return here would be a promise the app does not keep — and the
                  invitation genuinely does wait in "Invitations for you", which is the path
                  received-invitations task 5.1 verified. */}
              <p className="text-[13px] text-muted">{t('signInToRespond')}</p>
              <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-[14px] font-medium text-bg hover:bg-accent-hover"
                >
                  {t('createAccountToAccept')}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong px-6 py-3 text-[14px] hover:border-accent"
                >
                  {t('signIn')}
                </Link>
              </div>
            </div>
          )}
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
