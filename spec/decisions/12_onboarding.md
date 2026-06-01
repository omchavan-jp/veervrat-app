# Onboarding
_Last updated: 2026-06-01 | Round: R1_

## Confirmed Decisions

### Three Distinct Onboarding Layers

#### 1. Account Setup (one-time, at signup)
- Collected fields: name, email (auto-set from OAuth or entered during credential signup), gender (optional), date of birth (optional)
- Password + confirm password for credential signup
- No additional data collected here — kept minimal

#### 2. Framework Onboarding (one-time, post account setup)
Introduces the Veervrat framework before the user reaches the dashboard. Two sections:
- **What is Veervrat** — philosophy, purpose, "Our stance" (user autonomy emphasis), VM philosophy note
- **Process chart** — 4-stage model (Recognition → Study → Practice → Integration)

Ends with a single decision screen:
> "Ready to take your first test?"
> **[Take a test now]** · **[Explore the app first]**

- **Take a test now** → weakness selection → full test → test report → dashboard (with populated data)
- **Explore first** → dashboard (empty state with gentle nudge to take first test)

Full test during onboarding — not minimised. The test report is the aha moment. Minimising it dilutes the personalisation and the reveal.

Language preference is set during account setup or detectable from browser — surfaced here if not already set.

#### 3. UI Walkthrough (contextual, per section, first visit only)
- Triggered on first visit to each major section: dashboard, study flow, work flow, pothi, experience log, profile
- Tooltip/coach mark style — not a modal gate
- Shows what each element does and what to do next
- Dismissible at any point
- Does not block usage — appears alongside the live UI

### Flow Diagram
```
Sign up (email/Google)
  → Account setup (name, gender?, DoB?, language)
  → Framework onboarding
      Section 1: What is Veervrat
      Section 2: Process chart
      → "Ready to take your first test?"
            ↓ Yes                    ↓ No
          Weakness selection       Dashboard
          → Full test              (UI walkthrough
          → Test report             triggers here)
          → Dashboard
            (UI walkthrough
             triggers here)
```

### Design Principles Applied
- Value before friction — framework explains why before asking anything
- Full test = aha moment — report personalises the dashboard immediately
- Contextual education — UI walkthrough teaches by doing, not by front-loading
- Multi-step form — account setup is its own step, not bundled
- Eastern market comfort — framework onboarding is substantive, not a one-liner

## Open Questions (area-specific)
- Framework onboarding — is it skippable on subsequent logins or always shown once and never again?
- UI walkthrough — can users re-trigger it manually (e.g. from settings "restart tour")?
- Empty state nudge on dashboard (for users who skipped the test) — exact copy and CTA TBD
- Language preference: collected during account setup or auto-detected from browser with manual override?

## Flags
- ⚠ Users who skip the test during onboarding land on an empty dashboard — empty state design must include a strong but non-pushy nudge to take their first test.
