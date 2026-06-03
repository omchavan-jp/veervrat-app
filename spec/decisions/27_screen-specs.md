# Complete Screen Specifications
_Last updated: 2026-06-03 | 74 screens_

---

## Public / Auth

### Login
- **Entry:** `/login`, redirect from any auth-required route
- **Layout:** two-column (auth-left: branding/hero, auth-right: form)
- **Content:** email + password fields, "Forgot password?" link, "Log in" button, divider "or", Google OAuth button, "Don't have an account? Sign up" link
- **Validation:** email format, password required. Error: "Invalid email or password" (never reveal which is wrong)

### Signup
- **Entry:** `/signup`, "Sign up" link from login
- **Layout:** same two-column as login
- **Content:** display name, username (live uniqueness check), email, password + confirm password, language preference (EN/MR radio), gender (optional), DOB (optional), "Create account" button, divider "or", Google OAuth button
- **Validation:** username uniqueness (debounced check), email format, password policy (8+ chars, letter + digit), password match. Strength meter shown (weak/ok/strong).

### Forgot Password
- **Entry:** "Forgot password?" link from login
- **Layout:** simple centered form
- **Content:** email field, "Send reset link" button. Success state: "If an account exists with this email, a reset link has been sent." (never confirm whether email exists)

### Password Reset
- **Entry:** link from password reset email (token in URL)
- **Layout:** simple centered form
- **Content:** new password + confirm password fields, "Reset password" button
- **Error states:** expired link → "This link has expired. Request a new one." with CTA
- **Success:** "Password reset successfully" → auto-redirect to login (5s countdown)

### Email Verification
- **Entry:** link from verification email (token in URL), or prompt after credential signup
- **Layout:** simple centered status page
- **States:** verifying (spinner) → success ("Email verified") → redirect to app / expired ("Link expired, resend") with resend button

### OAuth Callback
- **Entry:** redirect from Google OAuth
- **Layout:** loading spinner only — no user-facing content
- **Behavior:** on success → redirect to dashboard (existing user) or onboarding (new user). On failure → redirect to login with error message.

### Soft Auth Prompt Modal
- **Entry:** guest attempts any gated action (take test, start journey, follow, comment)
- **Layout:** in-place modal overlay — does not navigate away, preserves scroll position and context
- **Content:** "Sign up or log in to continue" + [Sign up] [Log in] buttons. Dismissible — closes modal, returns to browsing.

---

## Onboarding

### Framework Onboarding
- **Entry:** immediately after first signup, before dashboard access. Shown once, never again.
- **Layout:** full-screen focused flow, no sidebar nav
- **Section 1 — What is Veervrat:** philosophy, "Our stance" card (autonomy emphasis), VM philosophy note ("Why vratmitra, not mentor")
- **Section 2 — Process Chart:** 4-stage model (Recognition → Study → Practice → Integration) with stage descriptions
- **Final screen:** "Ready to take your first test?" → [Take a test now] (→ weakness selection → test) / [Explore the app first] (→ dashboard)
- **Navigation:** forward/back between sections. Cannot skip to dashboard without passing through both sections.

### UI Walkthrough (per-section, first-visit)
- **Entry:** first visit to each major section (dashboard, study, work, pothi, experience log, profile)
- **Layout:** tooltip/coach mark overlay on live UI — not a modal gate
- **Behavior:** highlights key elements, explains what they do. Dismissible at any point. Does not block usage.
- **Re-triggerable:** from Settings → "Restart tour"

---

## Dashboard

### VA Dashboard (`/dashboard`)
- **Entry:** sidebar nav "Dashboard", default landing after onboarding
- **Layout:** main content area with optional sidebars (right sidebar: shloka of the day, community experiences, platform stats)
- **Top:** Saka date (Devanagari) + Gregorian date, greeting ("Namaskar, [name]"), "Log your experience" button
- **Stats bar:** virtues/subvirtues being cultivated (primary), journeys active/completed, E/R/C active/completed, weaknesses explored/tests taken (secondary)
- **Path card 01 — Study your weakness:** stats (weaknesses explored, tested, with journey), CTA arrow. Subtext/info link: "Why study weaknesses?" modal.
- **Path card 02 — Work on your weakness:** stats (journeys active/completed, E/R/C counts), CTA arrow.
- **Sentence suggestions section:** lowest-scored sentences from latest test results. Each: sentence text, subvirtue badge, score, weakness context, "Start journey" button. Empty state: "Take your first test to see personalized suggestions."
- **Right sidebar (collapsible):**
  - Shloka of the day carousel (Devanagari + transliteration + meaning + source, prev/next)
  - Community experiences carousel (testimonial card, author + location)
  - Platform stats grid (Vratarthis, Vratmitras, Tests solved, Practice-days completed)
  - Philosophy link ("Why we study shlokas")

### Saka Calendar Modal
- **Entry:** clicking the Saka date on dashboard
- **Content:** brief explanation of the Rashtriya Saur calendar — what it is, why it's shown. "Learn more" link → Saka Calendar Info Page.

### Saka Calendar Info Page
- **Entry:** "Learn more" from Saka modal
- **Content:** full historical and cultural context of the Indian National Calendar. Admin-managed content.
- **Navigation:** back link to dashboard

---

## Study Flow

### Weaknesses Browser
- **Entry:** Path card 01, sidebar nav "Study"
- **Layout:** weakness list grouped by clusters (A: Identity & Self-Perception, B: Will/Effort/Relating, C: Action & Engagement)
- **Each weakness card:** number, name (EN + Devanagari), description, stats (tests taken, journeys active/done)
- **Guest access:** browseable, "Take test" shows soft auth prompt

### Weakness Detail Page
- **Entry:** clicking a weakness from browser
- **Content:** weakness name (EN + Devanagari), description, linked subvirtues list (each clickable → subvirtue detail), "Cultivate these virtues" section, "Take test" CTA, test history pills (Test 1 · date, Test 2 · date), draft resume button if applicable
- **Guest access:** browseable, test CTA shows soft auth prompt

### Test Draft List
- **Entry:** Path card 01 stats → "Tests saved as drafts" count link
- **Content:** list of all saved test drafts: weakness name, last edited date, answered count / total, [Resume] button per draft

### Test Question Screen
- **Entry:** "Take test" from weakness detail, or "Resume draft"
- **Layout:** full-width focused mode, no sidebars
- **Top bar:** weakness name (Devanagari + English), progress bar (X/total answered), view mode toggle (one-at-a-time default / view-all), "Save draft & exit" button
- **One-at-a-time mode:** single sentence: number, text (EN + MR), info icon (→ sentence info modal). Four answer buttons: Always / Often / Sometimes / Never (नेहमी / कधी कधी / क्वचित / कधीच नाही). Color-coded on selection. Previous/next navigation. Can skip.
- **View-all mode:** scrollable list, all sentences with inline answer buttons. Answered sentences show selected answer. Can click any to jump to one-at-a-time mode.
- **Submit:** sticky footer, enabled when at least one sentence answered. If unanswered remain: popup "X sentences unanswered. Submit anyway or continue?" with [Submit anyway] [Continue].
- **Exit:** "Save draft & exit" → confirmation ("Save as draft" / "Discard") → weakness page

### Test Submission Preview
- **Entry:** "Submit test" from question screen
- **Content:** all sentences listed with selected answers (color-coded). Unanswered shown as "—".
- **Actions:** "Confirm submission" / "Go back to review"
- **Transition:** confirm → peak animation to report reveal

### Test Report Reveal (Peak)
- **Entry:** after submission confirmation
- **Framing:** awareness/direction-finding, not scoring. This is a mirror.
- **Peak animation:** report builds progressively — not instant page load.
- **Header:** weakness name (EN + Devanagari), date, X/total answered
- **Virtue/subvirtue view:** "Virtues to explore" badges derived from flagged sentences' subvirtue mappings
- **Suggested sentences (expanded):** Sometimes/Never, sorted lowest first. Each: sentence text (EN + MR), answer tag (color), subvirtue badge, "Start journey" button, sentence info icon
- **All other sentences (collapsed):** "See all sentences" expand → animate/swipe in. Each has "Start journey" — full freedom.
- **Exit:** "Back to weakness" link, or start journey

---

## Virtues & Weaknesses Browser

### Virtues Browser Page
- **Entry:** sidebar nav "Virtues & Weaknesses"
- **Layout:** two sections: Virtues (primary), Weaknesses (secondary)
- **Virtues section:** browse all virtues. Each: name (EN + Devanagari), description excerpt, subvirtue count
- **Weaknesses section:** browse all weaknesses. Each: name, description excerpt, linked subvirtue count, "Take test" CTA

### Virtue Detail Page
- **Entry:** clicking a virtue from browser
- **Content:** virtue name (EN + Devanagari), full description, list of subvirtues (each clickable)

### Subvirtue Detail Page
- **Entry:** clicking a subvirtue from virtue detail
- **Content:** subvirtue name (EN + Devanagari), description, parent virtue shown, weaknesses this subvirtue helps tackle (clickable buttons → weakness detail), sentences list (each clickable)

### Sentence Info Page/Modal
- **Entry:** clicking a sentence from subvirtue detail, from test question info icon, from Virtues browser
- **Content:** sentence text (EN + MR), subvirtue + virtue, active journey indicator if applicable
- **CTAs (authenticated):** "Take a test" (→ weakness selection for this sentence's subvirtue), "Choose a weakness to explore" (shows linked weaknesses)
- **No "Start journey" from here** — informational only. Journey starts only from test result or Flow 2 suggestions.
- **Guest:** browse only, CTAs show soft auth prompt

### "Why Study Weaknesses?" Modal
- **Entry:** Study path card subtext, weakness browser, test entry screen
- **Content:** virtue-first philosophy, "sadgunachi upasana" meaning, test → sentence → subvirtue → virtue chain explanation. Admin-managed.

---

## Journey Interior

### Journey Shell (persistent header + tabs)
- **Header:** journey title (editable inline), sentence text (EN + MR), "Cultivating [subvirtue] → [virtue]", weakness tags, journey state indicator (active/paused/dormant + resume button), VM name + avatar (or "No VM"), [Pause journey] action
- **Tabs:** Status Overview · Exposures · Resolutions · Challenges · Chat

### Status Overview Tab
- **Progress summary cards:** Exposures (active/approved/total), Resolutions (active/approved/streak), Challenges (active/approved/total)
- **Recent activity feed:** last 5-8 events (status changes, check-ins, VM suggestions, experience entries). Each links to context.
- **Contextual prompts:** unattached weakness suggestion, pending VM suggestions, challenge threshold met
- **Quick actions:** "Log experience", "Open chat"
- **Empty state (new journey):** "Select your first exposures and resolutions to begin" + tab CTAs

### Exposures Tab
- **Pool selection (top, collapsible):** available pool items filtered by journey weaknesses (union). VM suggestions highlighted. "Select" button per item.
- **Active items:** grouped by status. Cards with title, description, tier badge, status badge, VM sidenote, per-status actions (Start / Submit / Self-approve / Resubmit / Deactivate / Reactivate / Remove). "Add custom exposure" inline form.
- **Empty state:** "Browse the pool above to select your first exposures."

### Resolutions Tab
- Same as Exposures, plus: frequency label (editable), duration progress, check-in streak, "Log check-in" button (done/partial/missed + note), check-in history expandable.

### Challenges Tab
- Same pattern as Exposures. Duration in days. Suggestion threshold indicator (informational, not blocking).

### Journey Chat Tab
- **Content:** persistent VA-VM thread with context banner: "Viewing in context of [Journey Title]" (dismissible)
- **Features:** text + images + link previews + entity references (@journey, #exposure, etc. → clickable chips)
- **Empty state:** warm contextual prompt + suggestion chips ("Ask about your next step", "Share an experience")
- **No VM state:** "Invite a vratmitra to start a conversation" + invite CTA

### Journey Completion Flow
- **Entry:** "Submit for completion" button on Status Overview (enabled when ≥1 challenge submitted/approved)
- **Confirmation:** summary of journey progress (all ERC statuses). "Submit to VM for review" / "Complete journey" (if no VM).
- **Peak end moment:** on approval/self-approval → crafted completion screen. Reflection prompt ("What did this journey mean to you?"). Measured celebration consistent with serious tone.
- **Post-completion:** journey becomes read-only. CTA: "Start a new journey" or "Return to dashboard."

---

## My Vratmitras / Chat

### My Vratmitras Page (`/my-vratmitras`)
- **Layout:** two-panel — VM list left, detail right
- **Left panel:** avatar, name, online indicator, scope label per VM. Link to VA Actions at top. No VMs: "Invite a vratmitra" + philosophy modal link.
- **Right panel (selected):** avatar (large), name, online indicator, last active, Global VM badge, journey list with [Open] links, actions ([View Profile] [Open Chat] [Global VM Settings] [Remove]), chat email toggle.
- **Right panel (none selected):** "Select a vratmitra from the list."

### Chat Thread Page
- **Entry:** [Open Chat] from My Vratmitras, journey Chat tab, My Vratarthis, notification click
- **Layout:** full chat view — message list + input bar
- **Messages:** text, images (inline), link previews (OG card), entity references (clickable chips)
- **Input bar:** text field, image upload button, entity reference trigger (`@` / `#`)
- **Context banner (from journey):** "Viewing in context of [Journey Title]" — dismissible, entity refs navigate to journey context

### VM Invitation Flow
- **Entry:** "Invite" from My Vratmitras, user search, or journey settings
- **Steps:** user search (name/username/email) → select user → choose scope (Global VM / this journey) → send invitation
- **Non-platform user:** enter email → platform sends invite email with VM context pre-filled → invitee signs up → sees VM invitation to accept
- **Pending state:** shown in Invitations section with status, "Send reminder" (one allowed), "Cancel" action

### Global VM Swap Migration UI
- **Entry:** Settings → Vratmitra → "Change global VM", or My Vratmitras → [Global VM Settings] → "Change"
- **Step 1 — Outgoing VM journeys:** list of journeys assigned to outgoing VM. Per-journey: "Keep [name]" / "Remove" radios. Batch: "Keep all" / "Remove all".
- **Step 2 — Incoming VM assignment:** same journey list. Per-journey: "Assign [new name]" / "Keep current" / "No VM" radios. Batch: "Assign to all" / "Leave as-is".
- **Confirmation:** change summary before applying. "Confirm changes" button.
- **Notifications:** outgoing VM notified. Incoming VM receives invitation (pending acceptance).
- **Cancel:** returns with no changes at any point.

---

## My Vratarthis (VM Side)

### My Vratarthis Page (`/my-vratarthis`)
- **Layout:** two-panel — VA list left, detail right. Same pattern as My Vratmitras.
- **Left panel:** all VAs being mentored. Each: avatar, name, online indicator, scope label. Search/filter for large lists.
- **Right panel (selected):** VA avatar, name, last active, scope, journey list with state badges and [Open journey] links. Actions: [View Profile] [Open Chat] [Remove myself as VM].
- **Right panel (none selected):** "Select a vratarthi from the list."

### VM Actions Page (`/vratmitra/guidance`)
- **Layout:** single-column grouped list
- **Sections:** closure requests awaiting approval (with Approve/Return actions + inline note) → journey completion requests → suggestion status updates (read-only) → custom ERC review status (read-only)
- **Empty:** "No pending actions from your vratarthis."

---

## Actions

### VA Actions Page (`/actions`)
- **Layout:** single-column grouped list, most urgent on top
- **Sections:** ERC returned for revisit → VM suggestions awaiting decision (Accept/Dismiss) → pending VM approvals (read-only) → new ERC available → journey closure pending
- **Empty:** "All clear — you're on top of it."

---

## Experience Logging

### Global Experience Log Editor
- **Entry:** "Log your experience" from dashboard, sidebar nav "Log Experience"
- **Layout:** focused editor page
- **Content:** rich text editor (Tiptap), image upload, entity tag selector (weakness/virtue/subvirtue/sentence/ERC/journey — all optional, multiple), visibility tier (Only me / Friends / Public — set on publish)
- **Draft:** "Save as draft" available. Drafts always "Only me" until published.
- **Post-publish:** visibility changeable anytime from entry detail view.

### Experience Log List (personal)
- **Entry:** sidebar nav "My Experiences" or profile
- **Content:** chronological list of own entries (drafts + published). Each: excerpt, date, visibility badge, tag badges, edit/delete actions.

### Public Experience Pool
- **Entry:** community section, guest browseable
- **Content:** all public experience entries across all users. Author name (→ profile link), date, tags. Paginated.

### Journey Experience Log Entry
- **Entry:** "Log experience" from journey Status Overview
- **Content:** same editor as global, but pre-tagged to this journey. Attachable to one or many ERC items (active or deactivated).

---

## Content Pages

### What is Veervrat Page
- **Entry:** sidebar nav, "What is Veervrat" link from various locations
- **Layout:** three tabs — "What is Veervrat" / "Process Chart" / "Core Philosophy"
- **Tab 1:** philosophy, "Our stance" pull quotes, Devanagari lines
- **Tab 2:** 4-stage model with stage labels, descriptions, bullet details, arrows between stages
- **Tab 3:** philosophy grid (4 tiles), Pothi CTA
- **Guest accessible.** Admin-managed content — same source as framework onboarding.

### Pothi Page
- **Entry:** sidebar nav "Pothi"
- **Layout:** structured sections (6 from physical booklet). Each section: intro/commentary, shlokas with source citations, congregation response (where applicable), post-shloka commentary, resource links.
- **Navigation:** section list sidebar or scroll. Link to Shlokas page ("See more shlokas"). Link to Resources page.
- **"What is the Pothi?" modal** accessible from this page + sidebar.

### Shlokas Library Page
- **Entry:** Pothi page "See more shlokas" link, sidebar nav, shloka of the day "View more"
- **Layout:** searchable grid/list. Filter by source (Gita, Upanishad, etc.). Search by text/reference.
- **Each shloka card:** reference, Devanagari text, theme label. Click → Shloka Detail Modal.
- **Coming soon sections:** Stotras, Subhashitas, Upanishads, Bhagavad Gita, Commentaries (placeholder).
- **"Why we study shlokas" modal** accessible from this page.
- **Guest accessible.** Admin-managed.

### Shloka Detail Modal
- **Entry:** clicking a shloka card from Shlokas page, Pothi page, or shloka of the day
- **Layout:** two-column. Left: Devanagari + transliteration + meaning (EN + MR) + source citation. Right: contextual notes.
- **Tags section:** formal tags (virtue/subvirtue badges, clickable) + loose theme labels
- **Links:** "See more shlokas" → Shlokas page. "Why we study shlokas" → philosophy modal. Resource links if tagged.

### "Why We Study Shlokas" Modal
- **Entry:** Shlokas page, right sidebar, Shloka Detail Modal
- **Content:** prose with drop cap, pull quotes, Devanagari lines with glosses. Admin-managed.

### "What is the Pothi?" Modal
- **Entry:** Pothi page, right sidebar
- **Content:** explains what the Pothi is, history, role in Veervrat practice. Admin-managed.

### Resources Page
- **Entry:** Pothi page link, Shlokas page link, resource tags on any entity
- **Layout:** filterable list/grid. Each resource: thumbnail (auto-fetched OG for links, uploaded for files), title, one-liner, type badge (file/link), tags.
- **Detail view (expand or page):** full description (rich text), author context, formal + loose tags, referenced entities.
- **Guest accessible.** Admin-managed.

---

## Community

### Blog List Page
- **Entry:** sidebar nav "Community", "From the community" sidebar links
- **Content:** all published blogs. Each: title, author name + avatar (→ profile), date, excerpt. Paginated.
- **Guest accessible.** Featured blogs (moderator-curated) shown in sidebar separately.

### Blog Detail Page
- **Entry:** clicking a blog from list
- **Content:** full blog body (rich text), author info, date. Comments section below.
- **Comments:** flat list (no threading v1). Each: author name + avatar, body, date. Author can hide/delete own blog's comments. Report button on each.
- **Blog author actions:** edit, delete (own blog). Hide/delete comments on own blog.
- **Guest:** can read blog and comments. Cannot comment (soft auth prompt).

### Blog Editor
- **Entry:** "Write a blog" from blog list page, or edit own blog
- **Layout:** rich text editor (Tiptap). Title field (required), body, image upload.
- **Draft model:** "Save as draft" / "Publish". Drafts private until published.
- **Published visibility:** always public (no private/friends tier for blogs).

---

## Profile

### Own Profile Page
- **Entry:** sidebar user chip, Settings → Profile
- **Content:** all profile fields with current visibility indicators. Edit actions. Stats display. Public experience entries. Follower/following counts.
- **Actions:** edit fields, toggle visibility, change avatar.

### Public Profile View
- **Entry:** clicking any user's name anywhere (blog author, experience card, search result, VM invitation, chat)
- **Content:** toggled-on fields only. Hidden fields absent entirely. Last active / online indicator (if not hidden). "Guided X journeys to completion" stat (if user has acted as VM). "Follow" button (auth required). Public experience entries.
- **Private profile:** "This profile is private" screen if user set full privacy.
- **Guest:** can view public profiles. Follow shows soft auth prompt.

---

## Settings / Account

### Settings Page (`/settings`)
- **Layout:** left nav with sections, content area on right
- **Sections:**
  1. **Profile:** display name, username, avatar upload, gender, DOB, email (display only — change requires verification)
  2. **Privacy:** last active toggle (everyone/followers/hidden), online indicator toggle, full profile privacy toggle, per-field visibility toggles
  3. **Language:** UI language selector (EN/MR)
  4. **Notifications:** per-event-type email opt-out toggles, chat email global toggle, per-VM chat toggle (links to My Vratmitras)
  5. **Vratmitra:** current global VM (view/change/remove → migration UI), "Restart UI tour" button
  6. **Account:** change password (credential only), connected accounts (Google connect/disconnect), "Delete account" (→ anonymisation confirmation flow)

### Email Change Verification
- **Entry:** after changing email in Settings → Profile
- **Content:** "Verification email sent to [new email]. Click the link to confirm." Current email remains active until new one is verified.

### Delete Account Confirmation
- **Entry:** Settings → Account → "Delete account"
- **Layout:** confirmation modal with explicit warning
- **Content:** "Your account will be anonymised. Your content (journeys, logs, ERC) will be retained under a pseudonymous ID. This cannot be undone." + password/re-auth required + "Delete my account" danger button.

---

## Moderation

### Moderation Dashboard (`/moderation`)
- **Entry:** sidebar nav "Moderation" (visible only to moderators/admins)
- **Layout:** overview with section cards linking to sub-pages. Counts on each.
- **Sections:** Custom ERC Review (pending count), Reported Comments (pending count), Featured Content Curation, Shloka Management, Shloka Scheduling.

### Custom ERC Review Panel
- **Layout:** two-panel — queue list left, review detail right
- **Left:** pending submissions. Each: ERC title, type badge, submitter name, date, duplicate flag. Sorted FIFO. Filter tabs: All/Exposures/Resolutions/Challenges.
- **Right (selected):** context section (submitter profile, journey title, sentence, subvirtue → virtue, weakness tags — read-only). ERC content section (editable: title, description rich text, type-specific fields, formal + loose tags, Marathi translation). Duplicate indicator with side-by-side comparison if flagged.
- **Actions:** "Approve" (adds to global pool with edits), "Reject" (mandatory reason, stays journey-scoped), "Save edits" (draft without decision).
- **Empty:** "No custom ERC submissions pending review."

### Comment Moderation
- **Entry:** moderation dashboard or notification (reported comment)
- **Content:** reported comment with full context (blog title, comment body, reporter, author). Actions: "Hide" (visible to author only, marked hidden) / "Delete" (permanent) / "Dismiss report" (no action).

### Featured Content Curation
- **Entry:** moderation dashboard → Featured Content
- **Layout:** two sections: Featured Blogs (for sidebar), Featured Experiences (for sidebar carousel)
- **Each:** browseable pool of published content. Select/deselect for featuring. Drag to reorder.

### Shloka Management
- **Entry:** moderation dashboard → Shlokas (admin only)
- **Content:** CRUD list of all shlokas. Each: reference, Devanagari text preview, source, tag count. Actions: edit (→ shloka editor), delete.
- **Shloka editor:** Devanagari text, transliteration, meaning EN, meaning MR, source citation, formal tags (entity selector), loose theme tags (free-form with autocomplete).

### Shloka Scheduling
- **Entry:** moderation dashboard → Shloka Scheduling
- **Calendar view:** shows scheduled shlokas by date. Click date to assign a shloka.
- **Queue view:** ordered playlist of shlokas for auto-advance when no specific shloka is scheduled. Drag to reorder. Add/remove items.

---

## Admin

### Admin Dashboard (`/admin`)
- **Entry:** sidebar nav "Admin" (visible only to admins)
- **Layout:** overview cards: Users, Platform Stats, Content Management, Taxonomy, System.
- **All admin actions are audit-logged.**

### Admin User View
- **Entry:** admin dashboard → Users → select user
- **Content:** full user profile, all journeys (with contents), all test results, all experience logs. Read-only. "Override journey state" button (audit-logged, emergency only). Role management (assign/remove roles). Account actions (suspend, force anonymise, force logout).

### Taxonomy Management
- **Entry:** admin dashboard → Taxonomy
- **Content:** CRUD for virtues, subvirtues, weaknesses. Each with EN + MR names, descriptions. Subvirtue → virtue assignment. Weakness → subvirtue linking with priority.
- **Admin only** — moderators cannot access.

### Pothi Section Management
- **Entry:** admin dashboard → Pothi
- **Content:** CRUD for Pothi sections. Each section: section number, titles (EN + MR), intro text, shloka assignments (from shared shloka entity, ordered), congregation response, post-shloka commentary, resource links.
- **Admin only.**

### Resource Management
- **Entry:** admin dashboard → Resources
- **Content:** CRUD for resources. Each: type (file/link), URL or file upload, thumbnail, title, one-liner, rich text description, formal + loose tags.
- **Admin only.**

### Platform Stats Dashboard
- **Entry:** admin dashboard → Stats
- **Content:** all platform stats with historical trends. User growth, test volume, journey completion rate, ERC usage, active VMs, search query volume.

---

## Error / Utility

### 404 Page
- **Layout:** centered, branded
- **Content:** culturally appropriate messaging (shloka reference as in prototype), "Return to dashboard" + "Go to login" CTAs.
- **Variants:** generic 404, "Journey no longer active" (expired invite/deleted journey), "Profile is private."

### Offline / Network Error
- **Layout:** inline banner at top of current page (not a full-page redirect)
- **Content:** "You appear to be offline. Some features may be unavailable." Dismissible. Auto-clears when connection restored.

### Loading States
- **Skeleton loaders:** for page-level content loading (cards, lists, panels)
- **Spinners:** for button actions (replacing button text during submission)
- **Shimmer:** for image/card placeholders
- **Progress bar:** for test progress, file upload progress

### Toast / Notification Popups
- **Layout:** bottom-right stack, auto-dismiss after 5s
- **Types:** success (green), info (accent-2), warning (amber), error (danger)
- **Actions:** optional action button on toast (e.g. "Undo" for deactivate). Dismissible via X.
