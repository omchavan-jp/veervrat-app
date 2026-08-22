'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Fieldset, FieldsetLegend } from '@/components/ui/field';
import { AuthShell } from '@/components/auth/auth-shell';
import { DatePicker } from '@/components/ui/date-picker';
import { GoogleIcon } from '@/components/auth/google-icon';
import { PasswordStrength } from '@/components/auth/password-strength';
import { useSignup } from '@/hooks/use-auth';
import { CURRENT_CONSENTS } from '@/lib/consents';
import { latestQualifyingDobInputValue } from '@/lib/age';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { getRuntimeConfig } from '@/lib/runtime-config';

const FIELD_LABEL = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.1em] text-muted';

// 'error' distinguishes a failed availability check from 'idle' (not-yet-typed),
// so a network failure is surfaced and retriable instead of silently swallowed.
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  // Collapsed by default on both entry paths — consistency beats a special case, and the
  // Google route needs nothing from inside it.
  const [emailOpen, setEmailOpen] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  // Distinct from `error`: arriving here from Google sign-in without an account is the flow
  // working, not a failure, and the address bar should not say otherwise.
  const notice = searchParams.get('notice');
  const signup = useSignup();
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
    trigger,
    getValues,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { language: 'EN' },
  });

  // Recomputed per render rather than module-scope: a long-lived tab must not keep yesterday's
  // boundary once the date rolls over.
  const maxDob = latestQualifyingDobInputValue();

  const usernameValue = watch('username', '');
  const passwordValue = watch('password', '');

  const checkUsername = useCallback((username: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(username);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('error');
      }
    }, 400);
  }, []);

  useEffect(() => {
    checkUsername(usernameValue);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameValue, checkUsername]);

  const onSubmit = (data: SignupInput) => {
    const { acceptedTerms: _accepted, ...rest } = data;
    // The version is what makes the record meaningful: a boolean cannot answer "did they agree
    // to THIS version" once a document changes.
    signup.mutate({ ...rest, consents: CURRENT_CONSENTS });
  };

  /**
   * Google signup, not Google sign-in. The date of birth and consent are recorded first, so the
   * account is only created on return and only for someone who qualifies. Sign-in, on the login
   * page, authenticates existing accounts and never creates one.
   */
  const onGoogleSignup = async () => {
    // ⚠️ Validates ONLY the fields this path needs. `handleSubmit` would validate the whole form
    // and refuse, because Google supplies the display name, email address and the credential.
    // The username is NOT among them: it is a public identifier, and deriving one from someone's
    // email address without asking gives them a name they never chose.
    const ok = await trigger(['username', 'dob', 'acceptedTerms']);
    if (!ok) return;

    const { username, dob, language } = getValues();
    const pendingId = await authApi.startGoogleSignup({
      username,
      dob,
      consents: CURRENT_CONSENTS,
      language,
    });
    window.location.href = `${getRuntimeConfig().apiBaseUrl}/auth/google?pending=${pendingId}`;
  };

  const apiError = signup.error instanceof ApiError ? signup.error.message : signup.error?.message;

  const hero = {
    eyebrow: t('heroEyebrow'),
    heading: t('heroHeading'),
    devanagari: t('heroDevanagari'),
    gloss: t('heroGloss'),
  };

  if (signup.isSuccess) {
    return (
      <AuthShell hero={hero}>
        <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('successTitle')}</h2>
        <p className="mb-8 text-[15px] text-muted">{t('successBody')}</p>
        <Button
          size="lg"
          className="min-h-12 w-full text-[15px]"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          {t('backToLogin')}
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell hero={hero}>
      <h2 className="mb-2 font-display text-[32px] tracking-tight">{t('title')}</h2>
      <p className="mb-8 text-[15px] text-muted">{t('subtitle')}</p>

      {/*
        Arriving from Google sign-in with an account we do not recognise. Not an error on the
        person's part — they simply have no account yet — so it reads as an instruction rather
        than a failure, and it says which fields the Google route actually needs.
      */}
      {notice === 'google_signup_required' && (
        <Alert className="mb-4">
          <AlertDescription>{t('googleNoAccount')}</AlertDescription>
        </Alert>
      )}

      {oauthError === 'UNDERAGE' && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{t('ageRequirement')}</AlertDescription>
        </Alert>
      )}

      {apiError && (
        <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertDescription className="text-destructive">{apiError}</AlertDescription>
        </Alert>
      )}

      {/*
        Restructured so the page is honest about the two paths. The fields below are shared —
        both routes need them. Google supplies name, username, email and the credential itself,
        so those live in a disclosure rather than being shown to everyone and then discarded.
      */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="signup-username" className={FIELD_LABEL}>
            {t('username')}
          </Label>
          <Input
            id="signup-username"
            type="text"
            variant="underline"
            placeholder={t('usernamePlaceholder')}
            aria-invalid={errors.username || usernameStatus === 'taken' ? true : undefined}
            aria-describedby="signup-username-status"
            {...register('username')}
          />
          <div className="mt-1.5" id="signup-username-status" aria-live="polite">
            {usernameStatus === 'checking' && (
              <p className="text-xs text-muted">{t('usernameChecking')}</p>
            )}
            {usernameStatus === 'available' && (
              <p className="text-xs text-success">{t('usernameAvailable')}</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="text-xs text-danger">{t('usernameTaken')}</p>
            )}
            {usernameStatus === 'error' && (
              <p className="text-xs text-danger">{t('usernameError')}</p>
            )}
            {usernameStatus === 'idle' && <p className="text-xs text-muted">{t('usernameHint')}</p>}
          </div>
          {errors.username && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          {/* DatePicker renders a Popover trigger rather than a labelable control, so the
              caption stays a plain Label without htmlFor. */}
          <Label className={FIELD_LABEL}>{t('dob')}</Label>
          <Controller
            name="dob"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('dobPlaceholder')}
                // Opens on the most recent qualifying date and refuses anything later. The
                // server checks independently — this makes the boundary visible, it does not
                // enforce it.
                max={maxDob}
                // Opens on the boundary itself, so the rule is visible the moment the calendar
                // appears rather than being discovered by scrolling into disabled dates.
                defaultMonth={maxDob}
              />
            )}
          />
          {/* Stated before anyone tries, rather than only as a consequence of trying. */}
          <p id="signup-dob-hint" className="mt-1.5 text-xs text-muted">
            {t('ageRequirement')}
          </p>
          {errors.dob && (
            <p id="signup-dob-error" role="alert" className="mt-1.5 text-xs text-danger">
              {errors.dob.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              aria-invalid={errors.acceptedTerms ? true : undefined}
              aria-describedby={errors.acceptedTerms ? 'signup-terms-error' : undefined}
              {...register('acceptedTerms')}
            />
            {/* Linked now that the documents exist. Consent to a document nobody can read is
                not consent — this was deliberately left plain until there was something to
                link to, since a 404 at the moment of agreement is worse than plain wording. */}
            <span className="text-muted">
              {t.rich('acceptTermsLinked', {
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-accent underline decoration-accent/40 hover:no-underline"
                  >
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-accent underline decoration-accent/40 hover:no-underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
          {errors.acceptedTerms && (
            <p id="signup-terms-error" role="alert" className="mt-1.5 text-xs text-danger">
              {errors.acceptedTerms.message}
            </p>
          )}
        </div>

        <Fieldset>
          <FieldsetLegend className={FIELD_LABEL}>{t('languageLabel')}</FieldsetLegend>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-row gap-6"
                aria-label={t('languageLabel')}
              >
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="EN" />
                  {t('en')}
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="MR" />
                  {t('mr')}
                </label>
              </RadioGroup>
            )}
          />
          {errors.language && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {errors.language.message}
            </p>
          )}
        </Fieldset>
      </form>

      <div className="mt-6 space-y-3">
        <Button
          variant="outline"
          size="lg"
          className="min-h-12 w-full text-[15px]"
          onClick={onGoogleSignup}
          disabled={isSubmitting}
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          {t('googleCta')}
        </Button>
        <p className="text-center text-xs text-muted">{t('googleSignupNeedsDetails')}</p>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {t('or')}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Collapsed by default, and consistently so. Someone arriving from Google sign-in wants
            the Google route; someone who wants email is one click away and sees only then the
            fields that route actually needs. */}
        <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
          <CollapsibleTrigger className="min-h-11 rounded-lg border border-border px-4 text-[15px] hover:border-fg/30">
            {t('emailCta')}
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${emailOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
              <div>
                <Label htmlFor="signup-displayName" className={FIELD_LABEL}>
                  {t('displayName')}
                </Label>
                <Input
                  id="signup-displayName"
                  type="text"
                  variant="underline"
                  placeholder={t('displayNamePlaceholder')}
                  aria-invalid={errors.displayName ? true : undefined}
                  aria-describedby={errors.displayName ? 'signup-displayName-error' : undefined}
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p
                    id="signup-displayName-error"
                    role="alert"
                    className="mt-1.5 text-xs text-danger"
                  >
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-email" className={FIELD_LABEL}>
                  {t('email')}
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  variant="underline"
                  placeholder={t('emailPlaceholder')}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'signup-email-error' : undefined}
                  {...register('email')}
                />
                {errors.email && (
                  <p id="signup-email-error" role="alert" className="mt-1.5 text-xs text-danger">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-password" className={FIELD_LABEL}>
                  {t('password')}
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  variant="underline"
                  placeholder={t('passwordPlaceholder')}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'signup-password-error' : undefined}
                  {...register('password')}
                />
                <PasswordStrength password={passwordValue} />
                {errors.password && (
                  <p id="signup-password-error" role="alert" className="mt-1 text-xs text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                loading={signup.isPending}
                className="min-h-12 w-full text-[15px]"
              >
                {signup.isPending ? t('submitting') : t('submit')}
              </Button>
            </form>
          </CollapsiblePanel>
        </Collapsible>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {t('hasAccount')}{' '}
        <Link
          href="/login"
          className="text-accent underline decoration-accent/40 hover:no-underline"
        >
          {t('loginLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
