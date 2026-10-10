# RULE — Security Reporting

Enforcer and response owner: `omchavan-jp`.
Refresh when: the private reporting route or security responsibilities change.

## Report confidentially

Do not put vulnerability details, exploit code, credentials, personal data, or logs containing
them in a public issue or PR.

The agreed reporting route is GitHub private vulnerability reporting. Its activation is tracked
in [governance rollout status](ops/github-governance-status.md). Do not assume it is available
until the repository Security tab offers **Report a vulnerability**.

Once available, submit your report at:
https://github.com/omchavan-jp/veervrat-app/security/advisories/new

Until that route is active, existing collaborators should use their established private team
channel to contact the maintainer. External researchers may open an issue requesting a private
security-reporting channel, containing **only the contact request**, no finding details. The
maintainer must establish a private route before requesting the report. Do not include the
vulnerability in a public contact request.

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
