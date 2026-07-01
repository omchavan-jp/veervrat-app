# Pushing to GitHub (first-time setup)

This repo is currently **local-only** — no Git remote is configured. All work
(including branch merges) has happened on disk. When you're on a device that can
reach GitHub, follow these steps once to publish it.

## 1. Create an empty repo on GitHub
- github.com → New repository → name it (e.g. `veervrat`).
- **Do NOT** initialize with a README/.gitignore/license (the repo already has history).
- Copy the repo URL (SSH `git@github.com:you/veervrat.git` or HTTPS).

## 2. Add the remote (from the repo root)
```bash
git remote add origin <REPO_URL>
git remote -v   # verify
```

## 3. Push the main branches
```bash
git push -u origin main
git push -u origin dev
```

## 4. (Optional) Push retained feature branches
Per the project's git convention, feature branches are kept after merge. To publish them:
```bash
git push origin --all      # pushes every local branch
# or selectively:
git push origin fix/ui-ux-remediation fix/journey-duplicate-race \
               fix/prod-readiness-bugs chore/ops-hardening
```

## 5. Set the default branch on GitHub
- GitHub → repo → Settings → Branches → default branch → **`dev`**
  (the working integration branch; `main` is production-stable only).

## Notes
- `.env` files are gitignored and will NOT be pushed (verify with `git status`). Only
  `.env.example` is tracked.
- Nothing here requires pushing to keep working locally — CI/CD setup (next roadmap
  step) will need the remote, but local dev and merges do not.
- After the remote exists, the normal flow resumes: feature branch → PR into `dev`.
