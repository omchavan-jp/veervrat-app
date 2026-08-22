## Why

**The platform is 18+ and nothing enforces it.** The decision is recorded in
`spec/decisions/21_age-and-personal-attributes.md`; this change is the mechanism.

Four gaps, each verified against the code rather than assumed:

| | |
|---|---|
| Age validation | **None anywhere.** `dob` is never compared to anything |
| Where `dob` is collected | Onboarding, and it is `@IsOptional()` |
| Terms acceptance | **No record that any user has agreed to anything** |
| Google sign-in | Creates an account when none matches |

The last one is the sharp edge. A blocking "tell us your date of birth" step *after* Google
sign-in still produces an account row for someone we then turn away — so the platform ends up
holding records for exactly the people it is not for.

### The part that cannot be retrofitted

Everything else here could be fixed later. **Consent cannot.** Who agreed to which version of a
document, and when, is unreconstructable after the fact — there is no source to recover it from.
Every day the platform runs without it produces users whose agreement has no record.

That is the argument for doing this before testers rather than before launch.

## What changes

**1. Date of birth moves to account creation and is validated.**
Out of onboarding, into signup, required, and checked as 18 or over before an account exists.
Onboarding comes after the account and reads as skippable; an age gate cannot be either.

**2. Google signup and Google sign-in become separate flows.**
Today one endpoint serves both, plus account linking from settings.

- **Signup** collects date of birth and consent first, then hands off to Google. The account is
  created on return, already validated.
- **Sign-in** authenticates existing accounts only. No match → "no account found, please sign
  up." It never creates.
- **Linking** from settings is unaffected — the account already exists.

**3. Consent is recorded per document version.**
A version on the policy documents, and a per-user record of which version was accepted and when.
On a version bump, re-prompt.

**4. Date of birth is never displayed**, and is not returned by the public profile API.

**5. Gender is displayed on the profile when provided.**
It is currently collected, editable in two places, returned by the public-profile API, and
rendered nowhere. Displaying it is what makes collecting it legitimate — the alternative is to
stop collecting it. This is the smallest part of the change and the reason the field can be
described honestly in a privacy policy.

## What this deliberately does not do

**Ask Google for the birthday.** It needs a sensitive scope, which forces app verification —
weeks of review, and until it completes either a 100-user cap or an "unverified app" warning for
every user. It also often returns nothing, because it depends on the user having set a birthday
and made it visible. Weeks of process for a field we would still have to collect ourselves.

**Verify age beyond self-declaration.** Document checks, card verification and third-party age
services collect substantially more sensitive data than they protect, for a platform about
personal reflection — a worse privacy position, not a better one. Self-declaration with a
recorded affirmation is the standard, paired with an administrative route to remove an account
found not to qualify.

**Add a visibility control for gender.** The field is optional, so leaving it blank is already
the opt-out. A three-tier control earns its complexity on experience logs, not here.

## Existing users

All user data in both environments is disposable and nobody outside the maintainer uses either.
**Delete all users after this ships** rather than backfilling — which also removes the need for a
nullable-to-required migration path, and the question of what to do with accounts whose age is
unknown.

## Risks

**The signup surface is the highest-consequence surface in the product.** A regression locks
everyone out, and it is the one flow where a bug is discovered by strangers rather than by us.
Every path — email signup, Google signup, Google sign-in, Google linking, onboarding — needs a
test, including the negative cases.

**Consent must be recorded in the same transaction as account creation**, or a crash between the
two produces an account with no consent record: precisely the state that cannot be reconstructed.

**Two ways to reach account creation.** The email path and the Google path must apply the same
validation. A gate on one is not a gate.
