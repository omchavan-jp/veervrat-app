# Veervrat — Domain Glossary
_Last updated: 2026-08-21_

**Vratarthi**
The primary user of the app — a person working to overcome their weaknesses and build virtues through journeys.
_Avoid_: user, student, mentee

**Vratmitra**
A human mentor who guides a vratarthi. Always a real person, never AI. Can be scoped globally (one per vratarthi at a time) or to a specific journey.
_Avoid_: mentor, coach, guide

**Weakness** · मराठी: **उणीव** (sing.) / **उणीवा** (pl.)
A named character flaw or behavioural deficit that a vratarthi works to overcome. Linked to one or more subvirtues that address it.
_Avoid_: lacuna, problem, flaw
_Avoid in Marathi_: कमजोरी — replaced throughout on 2026-08-21 (confirmed with Nachiket). It reads as "weakness" in the sense of frailty or inadequacy; उणीव carries the intended sense of something lacking that can be filled, which is the whole premise of a journey.
_Oblique forms_ (Marathi inflects): उणिवेचा / उणिवेवर / उणिवेकडे (sing.), उणिवांचा / उणिवांकडे (pl.)

**Virtue**
A high-level character quality (e.g. Initiative, Resoluteness). Contains subvirtues.
_Avoid_: skill, trait

**Subvirtue**
A specific behavioural dimension within a virtue. Belongs to exactly one virtue. Has many sentences.
_Avoid_: sub-skill, attribute

**Sentence**
A first-person behavioural statement that a vratarthi is assessed on and that a journey is built around. Belongs to exactly one subvirtue. The atomic anchor of the entire content and journey system.
_Avoid_: statement, assessment item, question

**Test**
An assessment a vratarthi takes for a specific weakness. Consists of all sentences belonging to the subvirtues linked to that weakness. Results are scored and stored permanently; only the latest result drives suggestions.
_Avoid_: quiz, assessment, evaluation

**Journey**
A time-bound personal growth effort by a vratarthi, anchored to exactly one sentence. Has a user-editable title (default: sentence text or auto-generated). Contains selected exposures, resolutions, a challenge, and a chat thread with a vratmitra.
_Avoid_: program, plan, course

**Exposure**
A behavioural exercise drawn from the central ERC pool or created custom for a journey. Has three tiers: local, national, international. Selected by the vratarthi (suggested by vratmitra). Can be active or deactivated within a journey.
_Avoid_: exercise, activity, task

**Resolution**
A habit or repeated practice within a journey. Drawn from the central pool or created custom. Has a duration in weeks. Selected by the vratarthi (suggested by vratmitra).
_Avoid_: habit, commitment, practice

**Challenge**
A culminating test within a journey. Proposed by the vratmitra (via chat or directly) or added as custom ERC. Multiple challenges per journey are allowed. Has a duration in days. Completion is submitted by the vratarthi and approved by the vratmitra (or self-approved if no VM).
_Avoid_: final test, capstone, milestone

**ERC**
Collective shorthand for Exposure + Resolution + Challenge. The three content types that make up the active work inside a journey.
_Avoid_: content, exercises, program items

**Global Vratmitra**
The default vratmitra a vratarthi has selected for their account. At most one at a time. Automatically applied to new journeys unless overridden. Changing it triggers a migration UI for existing journeys.
_Avoid_: default mentor, primary mentor

**Journey Vratmitra**
A vratmitra assigned specifically to one journey. Independent of the global VM. Can be the same person or different. Selected by the vratarthi (invitation model).
_Avoid_: journey mentor, local mentor

**Custom ERC**
An exposure, resolution, or challenge created by a vratarthi or vratmitra specifically for one journey, not drawn from the central pool. Can be kept journey-scoped or submitted for review to join the global pool.
_Avoid_: user-created content, ad-hoc item

**VM Sidenote**
A note attached by a vratmitra to a specific ERC entity when suggesting it to the vratarthi. Explains the VM's reasoning. Revocable — if the VM unsuggests the entity, the sidenote is removed and any VA acknowledgement is nullified.
_Avoid_: comment, annotation, note

**Experience Log**
A free-form reflection or experience entry written by the vratarthi within a journey. Can be attached to one or many ERC entities (active or deactivated). Separate from completion status.
_Avoid_: journal, diary, log entry

**ERC Status**
The lifecycle state of an individual exposure, resolution, or challenge within a journey. States: `not_started`, `in_progress`, `submitted`, `approved`, `revisit`. VA submits; VM approves or returns to `revisit`. If no VM, VA self-approves.
_Avoid_: progress state, completion flag

**Permission**
A named, atomic capability in the system. Format: `resource.action` (e.g. `journey.view`, `erc.suggest`). Code always checks permissions, never role names directly. Permissions are the source of truth for access decisions.
_Avoid_: right, privilege, access level

**Guidance Page**
A top-level page aggregating all actionable items across all VMs and journeys for a VA — pending approvals, VM suggestions, new ERC available, journey closures awaiting VM. Functions as an inbox. Name is a placeholder (alternatives: Actions, Pending, My Queue).
_Avoid_: inbox, notifications (notifications are separate), to-do

**Entity Reference**
An inline mention of any app entity (journey, ERC item, weakness, virtue, shloka, blog, etc.) within a chat message. Renders as a clickable card/chip. Triggered via `@` or `#` syntax (exact per-type syntax TBD).
_Avoid_: mention, tag, link

**Invite Token**
A unique code generated for every platform or VM invitation. Carries context (inviter, invitee, scope, type) through the signup flow. Enables attribution and pre-filled VM acceptance.
_Avoid_: invite link, referral code

**Display Name**
A user's real name as shown throughout the app. Required at signup. Not unique.
_Avoid_: name, full name

**Username**
A unique handle used for search and public profile URL (`/u/username`). Required at signup. Auto-suggested from display name, user can edit before confirming.
_Avoid_: handle, user ID, screen name

**Follow**
A one-way relationship where one user subscribes to another VA's public activity. Does not grant access to private data. Guests cannot follow. What following enables (feed, notifications) is TBD.
_Avoid_: friend, connect, subscribe

**VM Invitation**
The act of a vratarthi inviting another user to become their vratmitra (global or journey-scoped). Requires explicit acceptance by the invitee. Relationship is `pending` until accepted, `active` once accepted.
_Avoid_: VM request, mentor request

**Dormant**
A system-triggered journey state. Activates after `x` days of no VA views or updates. The journey is alive but sleeping — VA can resume. Distinct from `paused` (VA-initiated).
_Avoid_: inactive, abandoned, stale

**Paused**
A VA-initiated journey state. VA manually suspends work. Can be resumed at any time.
_Avoid_: stopped, on hold

**Pool-sourced ERC**
An exposure, resolution, or challenge drawn from the central global ERC dataset (not created fresh for the journey). Contrast with custom ERC. When deactivated in a journey: stays visible greyed out; VA can permanently remove it from the journey.
_Avoid_: global item, dataset item

**Challenge Suggestion Threshold**
The condition under which the system and VM suggest the VA attempt a challenge. Default: at least one exposure and one resolution marked approved. VM can override the threshold per journey. The threshold is a suggestion trigger only — it does not gate challenge access.
_Avoid_: unlock condition, prerequisite
