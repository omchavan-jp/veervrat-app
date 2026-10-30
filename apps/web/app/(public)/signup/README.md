# signup

## Overview

Client signup form with email and Google paths [page.tsx:SignupPage]

## Interface

- Default SignupPage reads error and notice search parameters [page.tsx:SignupPage]

## Invariants

- Signup uses signupSchema and current consent versions; Google path validates username, dob, acceptedTerms [page.tsx:SignupPage]
- Username availability checks are debounced 400ms; date picker max is latestQualifyingDobInputValue [page.tsx:SignupPage]
- Success distinguishes verificationEmailSent false [page.tsx:SignupPage]

## Side Effects

- Checks username, submits signup, starts Google signup and navigates to Google endpoint [page.tsx:SignupPage]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
