# Age and Personal Attributes

## Confirmed Decisions

**The platform is strictly 18+.** Adults only. This is stated in the terms, declared by the user
at account creation, and recorded.

**Date of birth is required at account creation** — not during onboarding, which comes later and
reads as optional. It is validated as 18 or over before the account exists.

**Date of birth is never displayed.** Not on a profile, not to followers, not behind a user
preference. A date of birth is an identity-verification token used by banks and government
services; publishing it hands out a credential. If age must be conveyed anywhere, derive it and
show that instead.

**Age is self-declared, and that is sufficient.** Document checks, card verification and
third-party age-assurance services all collect substantially more sensitive data than they
protect, for a platform about personal reflection. The obligation is met by stating the
restriction, recording the affirmation with a timestamp, and acting when we learn an account
does not meet it — including an administrative path to remove one. Perfect enforcement is not
the standard, and pursuing it would make the privacy position worse rather than better.

**Google signup and Google sign-in are separate flows.** Signup collects date of birth and terms
acceptance before handing off to Google; sign-in authenticates existing accounts only and never
creates one. Without this split, an under-18 visitor is turned away *after* an account row
already exists.

**The birthday is not requested from Google.** It requires a sensitive scope, which forces app
verification — weeks of review, and meanwhile either a 100-user cap or an "unverified app"
warning shown to every user. It also frequently returns nothing, since it depends on the user
having set a birthday and made it visible. The field has to be collected directly regardless.

**Gender is optional, and shown on the profile when provided.** One rule, no visibility setting:
leaving it blank *is* the opt-out, and it is self-evident without a settings page or a paragraph
in the privacy policy.

- Values are open — male, female, other, or free text. Not an enumeration.
- A three-tier visibility control (public / followers / private) is deliberately **not** applied.
  That model earns its complexity on experience logs, where the content is sensitive and the
  audience genuinely matters. It does not here.
- Consequence, accepted: someone who leaves it blank is absent from gender statistics.
- Compulsory display was considered and rejected. Platform transparency means being clear about
  how the system works and what data it holds — not compelling users to disclose personal
  attributes to one another. This platform asks people to write down their weaknesses; the
  people most likely to value privacy are exactly the people it exists for.

**A field that is collected and never used is a liability.** Both `dob` and `gender` were
previously stored and read by nothing. Personal data with no purpose still has to be protected,
disclosed and exported. Either it earns its place or it should not be collected.

## Open Questions (area-specific)

_(none — area closed)_

## Flags

- ⚠ Terms and privacy acceptance must be recorded **per document version**. Retrofitting is
  impossible: who agreed to what cannot be reconstructed afterwards.
