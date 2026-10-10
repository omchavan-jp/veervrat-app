# RULE — Security Reporting

Enforcer and response owner: `omchavan-jp`.
Refresh when: the private reporting route or security responsibilities change.

## Report confidentially

Do not put vulnerability details, exploit code, credentials, personal data, or logs containing
them in a public issue or PR.

Use [GitHub private vulnerability reporting](https://github.com/omchavan-jp/veervrat-app/security/advisories/new),
or **Security → Report a vulnerability**. Activation/read-back evidence is recorded in
[governance rollout status](ops/github-governance-status.md).

If the private route is unavailable, existing collaborators should contact the maintainer through
their established private team channel. External researchers may open an issue containing only
a request for a private reporting channel, never finding details. The maintainer must establish
that channel before requesting the report.

In the private report, include affected behavior/version, reproduction steps, expected impact,
and any proposed fix. Do not send real credentials or other people's personal data.

## Response and releases

The maintainer triages reports and coordinates a private fix before public disclosure where
appropriate. This policy does not promise a response deadline or an automated security service.
Do not test destructively against UAT or production without explicit authorization.

Only explicitly verified production releases should be described as supported; creating a tag
or enabling a scanner does not establish that a release is safe. Security fixes follow the
review, UAT acceptance, release authorization, and recovery rules in
[Git and Release Governance](documentation/25_Git-and-Release-Governance.md).
