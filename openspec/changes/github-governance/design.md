# Governance implementation design

## Authoritative sources

The policy is RULE; rollout status is STATE. CONTRIBUTING, agent reminders, and DEPLOYMENT link
to the policy rather than redefine it. Update status at each implementation/verification event.

## Control boundaries

- Keep required PR/check protections separate from the owner's approval exception.
- A Git tag controls a reference, not main ancestry or UAT acceptance; validate release evidence
  in trusted workflows, not editable free-text records.
- Store the actual accepted image set because path-filtered UAT deployments can mix versions.
- Gate all production-changing steps and production credentials; separate Azure authority.
- Serialise production operations and retain deliberate schema-aware recovery.

Exact payloads, authorized evidence storage, cloud bootstrap order, and safe role tests are
implementation designs for subsequent PRs; this initial PR does not invent executable controls.

## Blast radius

1. Contributors, owner, bots, and public fork authors: contribution/review instructions change;
   executable access remains unchanged until settings batches are applied.
2. Entry points: AGENTS/CLAUDE, documentation index, contributor guide, PR template, workflow
   README, status, and release runbook must resolve to the same policy.
3. Invalidated assumptions: permanent branch retention, tag-only approval, prose-only merge
   restrictions, automatic production rebuilds, and prohibiting all automated migrations.
4. Verification: docs links and stale-rule checks now; meaningful permission/scanner/release
   tests when corresponding mechanisms change. Preserve the current CD behavior in this PR.

## Initial-PR deployment implication

The current classifier treats .github/CODEOWNERS as an unknown app-relevant path. Thus merging
this PR can trigger the existing UAT build/deployment even though it changes no application
code. Do not change the classifier as an unrequested workaround; call out this effect before merge.
