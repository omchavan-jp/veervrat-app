# Focused Azure, repository and documentation cleanup

Owner: omchavan-jp. Authorized in the maintainer chat on 2026-10-11.
Status: reviewed identity-removal plan pending apply; historical branch purge completed.

Remote purge removed exactly 186 inventoried historical refs atomically with expected-SHA leases.
Post-purge inventory contains main, 16 open Dependabot heads and this active cleanup branch.
All tag refs/SHAs compared unchanged before/after. No additional Git backup was created;
remote ref removal has no guaranteed recovery. Existing local work/objects were not deleted.

## Azure scope

Remove only retired `veervrat-github-actions` and its obsolete Terraform output. Its six old
grants and three GitHub FICs were already removed and fresh federation rejected. A normally
locked plan shows zero additions/changes and one deletion, the exact legacy identity.
No replacement identity, grant, application, database, state container or production tag changes.
Preserve private Terraform recovery state; the no-backup decision applies only to historical Git refs.

The maintainer chose deletion over retaining the inert object: GitHub/Azure audit history and
the [cutover record](azure-identity-cutover.md) already record its old non-secret identifiers.
The negative-federation test accepts a specific absent-application response for that known old
client, after a successful same-assertion replacement control; unrelated authentication/network
errors still fail. It is not a production deployment.

## Remote branch inventory and deletion boundary

Inventory before this cleanup PR: 203 remote branches: main, 16 open Dependabot heads and
186 historical human-work branches. No other open human PRs were present.
179 historical tips exactly match a merged PR head snapshot. Seven needed extra review:

| Branch | Evidence |
| --- | --- |
| dev | All five copy-edit values from its unique tip match current English/Marathi JSON exactly |
| docs/post-133-status | Age-gate enforcement and separate Google signup/sign-in statements are on main |
| docs/prod-2026-08-17-release | Merged release/changelog PR; later outage note is on main; historical privacy/terms blocker is superseded by implemented routes |
| docs/roster-uat-verified | Historical verification-task record commits only; no application changes; no task contents edited or ported |
| feat/batch3-features | Application work merged in #237; later task-record tip has a matching patch already on main |
| feat/google-secret-keyvault | Current Terraform uses the Google Key Vault resource/reference, not a plain secret env value |
| fix/production-readiness | Base pipeline work merged in #53; later parallel/per-job-auth/cache/access-guard behavior is present in current workflows |

Squash ancestry and unmatched patch IDs alone are not evidence of missing work. Historical
records may differ from today's documentation; do not resurrect obsolete guidance as cleanup.
Delete only the inventoried historical refs, with expected-SHA leases; stop if any tip changed
or gained an open PR. Preserve main, all tags, Dependabot heads and the cleanup branch.
No additional Git backup is requested or created. Local work branches/commits are not purged.
Ref deletion does not edit repository OpenSpec content; no OpenSpec records are changed.

## Documentation boundary

Reconcile living deployment/governance/identity facts for the work already completed, retaining
dated historical evidence instead of rewriting it as current. Full repository-wide documentation
audit follows the remaining release-control implementation. No dependency upgrades, organization
transfer, development environments or production release are included in this cleanup.
