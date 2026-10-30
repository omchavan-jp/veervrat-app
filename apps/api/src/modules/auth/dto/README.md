# dto

## Overview

Class-validator request contracts for registration, Google signup/linking, sign-in, recovery, email change and onboarding. [register.dto.ts:RegisterDto] [start-google-signup.dto.ts:StartGoogleSignupDto] [link-google.dto.ts:LinkGoogleDto] [login.dto.ts:LoginDto] [forgot-password.dto.ts:ForgotPasswordDto] [reset-password.dto.ts:ResetPasswordDto] [resend-verification.dto.ts:ResendVerificationDto] [verify-email.dto.ts:VerifyEmailDto] [email-change.dto.ts:RequestEmailChangeDto] [complete-onboarding.dto.ts:CompleteOnboardingDto]

## Interface

- Exports ConsentDto and RegisterDto with email/password/displayName/username/dob/consents and optional language; StartGoogleSignupDto has username/dob/consents and optional language. [register.dto.ts:ConsentDto] [register.dto.ts:RegisterDto] [start-google-signup.dto.ts:StartGoogleSignupDto]
- Exports LoginDto(email,password), LinkGoogleDto(token,password), ForgotPasswordDto(email), ResendVerificationDto(email), ResetPasswordDto(token,newPassword), VerifyEmailDto(token). [login.dto.ts:LoginDto] [link-google.dto.ts:LinkGoogleDto] [forgot-password.dto.ts:ForgotPasswordDto] [resend-verification.dto.ts:ResendVerificationDto] [reset-password.dto.ts:ResetPasswordDto] [verify-email.dto.ts:VerifyEmailDto]
- Exports RequestEmailChangeDto(newEmail,currentPassword?), ConfirmEmailChangeDto(token) and CompleteOnboardingDto(displayName?,username?,language?,gender?). [email-change.dto.ts:RequestEmailChangeDto] [email-change.dto.ts:ConfirmEmailChangeDto] [complete-onboarding.dto.ts:CompleteOnboardingDto]

## Invariants

- ConsentDto requires nonempty string documentKey of at most 64 characters and integer version. Register/Google signup consents must be nonempty arrays of at most 10 nested ConsentDto values, transformed with Type; DOB is nonempty strict IsDateString. [register.dto.ts:ConsentDto] [register.dto.ts:RegisterDto] [start-google-signup.dto.ts:StartGoogleSignupDto]
- Register requires nonempty email, string password 8–128, nonempty string displayName <=255, nonempty lowercase alphanumeric/underscore username 3–30; Google signup uses same username constraints; optional language limited to EN/MR. [register.dto.ts:RegisterDto] [start-google-signup.dto.ts:StartGoogleSignupDto]
- Login requires nonempty email and string password; forgot/resend require nonempty email. Link requires nonempty string token and string password >=8; reset requires nonempty string token and string newPassword 8–128; verify requires nonempty string token. [login.dto.ts:LoginDto] [forgot-password.dto.ts:ForgotPasswordDto] [resend-verification.dto.ts:ResendVerificationDto] [link-google.dto.ts:LinkGoogleDto] [reset-password.dto.ts:ResetPasswordDto] [verify-email.dto.ts:VerifyEmailDto]
- Email change validates newEmail as email <=254 and optional currentPassword as string >=1; confirmation token is string >=1. Optional onboarding displayName is string 1–255, username is string 3–30 matching lowercase letters/digits/underscore, language EN/MR, gender string <=50; DOB has no onboarding field. [email-change.dto.ts:RequestEmailChangeDto] [email-change.dto.ts:ConfirmEmailChangeDto] [complete-onboarding.dto.ts:CompleteOnboardingDto]

## Side Effects

- None explicitly defined in this directory.

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
