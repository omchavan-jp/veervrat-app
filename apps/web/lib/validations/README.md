# validations

## Overview

Zod schemas for authentication, signup and account setup.

## Interface

- Exports loginSchema, signupSchema, googleSignupSchema, forgotPasswordSchema, resetPasswordSchema, onboardingSchema and inferred input types [auth.ts:loginSchema] [auth.ts:signupSchema] [auth.ts:googleSignupSchema] [auth.ts:forgotPasswordSchema] [auth.ts:resetPasswordSchema] [auth.ts:onboardingSchema] [auth.ts:LoginInput] [auth.ts:SignupInput] [auth.ts:ForgotPasswordInput] [auth.ts:ResetPasswordInput] [auth.ts:OnboardingInput].
- Exports accountSetupSchema and AccountSetupInput [onboarding.ts:accountSetupSchema] [onboarding.ts:AccountSetupInput].

## Invariants

- Signup checks minimum age, terms, username format and password strength; reset passwords must match [auth.ts:signupSchema] [auth.ts:resetPasswordSchema].
- Account setup omits date of birth and accepts EN/MR language [onboarding.ts:accountSetupSchema].

## Side Effects

- No explicit side effects identified.

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
