# Veervrat — Domain Glossary
_Last updated: 2026-05-31_

**Vratarthi**
The primary user of the app — a person working to overcome their weaknesses and build virtues through journeys.
_Avoid_: user, student, mentee

**Vratmitra**
A human mentor who guides a vratarthi. Always a real person, never AI. Can be scoped globally (one per vratarthi at a time) or to a specific journey.
_Avoid_: mentor, coach, guide

**Weakness**
A named character flaw or behavioural deficit that a vratarthi works to overcome. Linked to one or more subvirtues that address it.
_Avoid_: lacuna, problem, flaw

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
A culminating test within a journey. Proposed by the vratmitra (via chat or directly). Has a duration in days. Completion is logged by the vratarthi and approved by the vratmitra to close the journey.
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
