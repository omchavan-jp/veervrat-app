import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

/**
 * Terms and Privacy, deliberately outside `(public)`.
 *
 * Every other page in `(public)` — login, signup, password reset, email verification — is
 * meaningfully usable only by someone who is NOT signed in, so that group's layout bounces a
 * signed-in visitor straight to `/dashboard`. These two pages are not like that: `PolicyDocument`
 * says so directly — "deliberately reachable without signing in" — but reachable without an
 * account was never the same claim as reachable only without one.
 *
 * Nobody noticed the gap until the consent gate (#140/#154) became the first thing that ever
 * asked a signed-in user to go read these pages: the link opened, and `(public)`'s redirect sent
 * them straight back to the dashboard before they could read a word — a document nobody can open
 * is not one anyone can be asked to accept, no matter what a dialog in front of it says.
 *
 * No redirect logic here at all, in either direction. Signed in or not, the page renders.
 */
export default async function PolicyLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
