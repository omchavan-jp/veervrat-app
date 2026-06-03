# Guest / Anonymous Access
_Last updated: 2026-05-31 | Round: R1_

## Confirmed Decisions

### What Guests Can Access (no auth required)
- Weakness list, cluster structure, and individual weakness descriptions
- Sentences within each weakness (browse only — no test-taking)
- Pothi (full shloka library — search, filter, read)
- Community blogs
- Public experiences (testimonial cards)
- Platform-level stats (Vratarthis count, Vratmitras count, Tests solved, Practice-days completed)
- Public VA profiles
- What is Veervrat page (all three tabs: What is Veervrat, Process Chart, Core Philosophy)
- Shloka of the day, philosophy modal, shloka detail modal
- Marketing/about pages

### What Guests Cannot Access
- Taking a test
- Starting or viewing a journey
- Any VA's test results or journey data
- Chat threads
- Experience logs (unless marked Public by the author — see global experience logging spec)
- VM dashboard
- Admin/moderator panels
- Custom ERC review queue

### Interaction Model
- No hard redirects for gated content — **soft prompt** (modal or inline) appears in-place when a guest attempts a gated action
- Prompt offers: "Sign up" or "Log in to continue"
- Guest state is not persisted between visits — nothing saved without auth

### Role-Gated Content (all previously specced, confirmed exhaustive)
No non-obvious role-gating beyond what is already in `decisions/05_permissions.md`. All gating is derived from the VA/VM/admin permission model.

- **Public experience log entries marked "Public":** visible to guests. Confirmed in `decisions/14_experience-logging.md`.
- **Public VA profile:** fields confirmed in `decisions/10_public-profile.md`. All toggled-on fields visible to guests.

## Open Questions (area-specific)
- SEO / crawlability — public content indexable by search engines? TBD (see below)

## Confirmed Additional
- **SEO / crawlability:** public-facing pages (Pothi, Shlokas, blogs, weakness list, public profiles, What is Veervrat) are server-side rendered and should be indexable. Implementation requires: `<meta>` tags per page, `robots.txt` allowing crawl of public routes, `sitemap.xml` for public content. Specific meta tag content per page type is an implementation detail.

## Flags
- ⚠ Soft prompt must not lose the user's current context (scroll position, selected weakness, etc.) when dismissed — UX requirement for implementation.
