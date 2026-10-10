# RECORD — GitHub Security Baseline, 2026-10-10

Frozen snapshot, not a statement of current security. Live findings are in GitHub's Security tab.
Owner: `omchavan-jp`. Reassess as updates and fixes merge; do not rewrite this historical snapshot.

## Evidence

CodeQL default setup analyzed Actions, JavaScript/TypeScript and Python at main commit
`cb9eaadab2c5cb48eff6df33f911448a098574de`. All three analyses completed successfully in
[the baseline run](https://github.com/omchavan-jp/veervrat-app/actions/runs/38028686421).
Passing analysis means scanning ran, not that no vulnerabilities exist.

Dependabot alerts/security updates and private vulnerability reporting were enabled. Secret
scanning and push protection were already enabled and retained. Outside-contributor runs now
require approval for all external contributors; workflow defaults are read-only and cannot
approve PR reviews.

## Initial inventory

| Scanner    | Findings                                    | Severity distribution                                           |
| ---------- | ------------------------------------------- | --------------------------------------------------------------- |
| Dependabot | 176 alert records / 137 distinct advisories | 7 critical, 68 high, 85 medium, 16 low                          |
| CodeQL     | 7 alerts                                    | 4 high security findings, 3 medium workflow-permission findings |

Alert records can repeat an advisory across a manifest and lockfile; they are not 176 distinct
exploitable flaws. No findings were dismissed or declared resolved as part of this baseline.

## Triage and follow-up

- Prioritize the critical dependency advisories before the next production release. The seven
  records concern Next.js (six records / three advisories) and proxy-addr (one advisory).
  One Next.js advisory recommends 16.3.6; proxy-addr recommends 2.0.8. Confirm all affected
  advisories and runtime dependency paths before selecting a complete update, then verify the
  resulting lockfiles and application behavior. Do not auto-merge dependency fixes.
- The three CodeQL workflow-permission warnings are addressed by the explicit read-only job
  configuration in the security automation PR; only a subsequent analysis proves resolution.
- Review the four high CodeQL findings individually. Source inspection separates runtime
  header/session-cookie concerns from test/tooling concerns. A test identifier and a
  document-reference extractor are not automatically production exploits, but that does not
  justify a blanket dismissal. Details and any reasoned dismissal belong in private alert triage.
- The high/critical merge gate applies to newly introduced CodeQL findings and requires analysis;
  it does not erase existing findings or replace dependency remediation.
- An initial automatic security-update attempt failed on source-map-js with
  `security_update_not_possible`: latest resolvable 1.2.1 versus minimum fixed 1.2.2.
  The updater reached pnpm; enablement alone does not guarantee every
  advisory has an automatically generated fix. Track the [failed update run](https://github.com/omchavan-jp/veervrat-app/actions/runs/38028725158)
  and any successful update PRs separately. Do not downgrade pnpm merely to satisfy a stale
  compatibility table: upstream support for pnpm 11/12 merged on 2026-09-15.

See [live rollout status](../github-governance-status.md) for activated controls and remaining work.
