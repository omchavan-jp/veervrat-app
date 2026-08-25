# Working plan — what to fix before beta testers

**Written 2026-08-25.** A triage of every open issue against one question: *what actually breaks
for a real person invited to test this?*

Not a roadmap and not a wish list. Items are here because their absence would mislead, harm, or
block a tester — or because leaving them costs more than fixing them. Everything else is named as
**not** a blocker, deliberately, so that decision is visible rather than implied.

Re-read the issues themselves before acting; this document records a judgement made on one day
and the issues are where the detail lives.

---

## The shape of it

One product gap, one invisible-failure gap, one money control, four data-and-legal obligations,
and one verification.

| | |
|---|---|
| Product gap | #22 + #193 — the vratmitra side of the app |
| Invisible failure | #194 — search is not provisioned, and its absence looks like empty results |
| Money | #93 — no hard spending cap |
| Data & legal | #134 + #154, #136, #131, #189 |
| Verification | Exercise the production upload path once |

---

## Must fix before testers

### 1. #22 + #193 — the vratmitra side of the app

The vratmitra↔vratarthi relationship is the product (`spec/CONTEXT.md`). A vratmitra cannot see
or accept a request inside the app, and has no roster of the people they mentor.

`(vratmitra)/` holds one real page and three `.gitkeep` placeholders; there is no endpoint
answering "who am I a vratmitra to?", and `listInvitations` is `listByInviter` — invitations you
*sent*.

**Honest qualification:** the emailed token link at `/invitations/<token>/accept` does work, so
the flow is not impossible. But if any tester is a vratmitra, half the application does not exist
for them.

**Blocked on a product decision** (see Open decisions): is *vratmitra* a mode the app switches
into, or a role whose surfaces sit beside the vratarthi ones? Most people here will be both.

### 2. #194 — search is not provisioned anywhere

`MEILI_HOST` is set in no environment, and no search resource exists in the Terraform module.
The application returns **empty results**, not an error.

A tester will not conclude that search is broken. They will conclude the content is not there —
and either not report it, or report the wrong thing.

Provisioning is the intended answer. An honest "search is unavailable" state is a fraction of the
work and is strictly better than silence, so it is the fallback if provisioning slips.

### 3. #93 — no hard spending cap

Testers mean real usage. The subscription is a Microsoft Customer Agreement, which has **no
spending limit**; when the grant is exhausted or expires, usage silently bills a personal card
belonging to an individual, not the organisation.

Budget alerts at ₹13,000/month exist. **An alert is a notification, not a stop.** The control
that matters is the budget → action group → automation that halts resources.

### 4. #134 + #154 — legal review, and native-speaker review

Real people accepting policy documents that have had neither. The platform holds self-assessed
weaknesses and private reflections; `ops/data-map.md` §1 classes that as the sensitive core.

This gates **collecting the data**, not shipping the code.

### 5. #136 — breach and lawful-request procedure

Once real reflections are held, "we will work it out if it happens" is not a position. This is a
page of writing, not a project, and it must exist before it is needed rather than during.

### 6. #131 — no copy of the data exists outside Azure

Beta data is real people's private writing held in one provider.

Needs an off-Azure copy **and one verified restore**. An untested backup is a hypothesis, and
this project has already recorded one instance of a mechanism believed to work that never had.

### 7. #189 — uploaded photos keep their EXIF, including GPS

A tester attaching a photo to a public experience log publishes where it was taken. Cheap to fix,
and a live disclosure of personal data rather than technical debt.

### 8. Exercise the production upload path once

Not an issue. Production's storage account, containers and role grants are all verified; **no
file has ever been written through them.** Everything about it is confirmed except the thing
itself. This is ten minutes and it creates data in production, so it needs a deliberate decision.

---

## Strongly recommended, not strictly blocking

**#125 + #124 — acknowledgement, and finishing the remediation's adoption.**
This changed status on 2026-08-25. Until then `hooks/use-toast.ts` was a stub that logged to the
console and returned, so 51 call sites across 21 files displayed nothing — the application had
**never** spoken to a user. It can now. The gap between "does the right thing silently" and
"feels alive" is most of what beta feedback will otherwise be about.

Reasonable to promote above the line.

**#75 — no way to administer data in a deployed environment.** Needed the first time a tester is
stuck and someone has to look.

**#140 — anonymisation leaves more behind than the word implies.** Needed if a tester asks to be
removed.

---

## Deliberately not beta blockers

#9, #24, #33, #34, #36, #37, #38, #39, #41, #78, #82, #84, #85, #90, #91, #92, #116, #121, #132,
#137, #138, #142.

Three worth naming, because skipping them looks like an oversight otherwise:

- **#34 (moderation filters)** — the risk is proportional to who can post. A closed beta of known
  people is a different exposure from an open one. Revisit before opening up.
- **#137 / #138 (access register, deploy-from-nothing runbook)** — bus-factor insurance. They
  matter if the one person holding everything is unavailable; they do not affect a tester.
- **#116 / #24 / #37 (navigation and redesign)** — these are what beta feedback should *inform*.
  Doing them first spends the beta's most valuable output before receiving it.

---

## Sequence

**The ordering principle: start the work whose duration you do not control.** Legal review and a
native-speaker review wait on other people. Everything else waits on us. Beginning them last is
what turns a two-week task into the thing everyone waits for.

### Wave 0 — hours, and derisks everything after

1. **#93** — budget action group that stops resources, not just alerts.
2. **Exercise the production upload path.** Ten minutes; needs a decision because it writes to
   production.

### Wave 1 — start immediately, finishes on someone else's clock

3. **#134** — assemble the legal briefing pack and get it to Rahul Dharmadhikari.
4. **#154** — find the native-speaker reviewer and hand over the Marathi documents.

Neither blocks engineering. Both block the invitation going out. Start them and let them run.

### Wave 2 — build while Wave 1 waits

5. **#189** — EXIF stripping. Small, independent, and a live privacy leak.
6. **#194** — search: decide what to run, cost it into `ops/infra-budget-log.md`, provision.
   Ship the "unavailable" state regardless, as a guard against this recurring silently.
7. **#131** — off-Azure copy plus a restore actually performed.
8. **#136** — write the breach and lawful-request procedure. Fits any gap; needs no environment.

### Wave 3 — the largest, and gated on a decision

9. **Decide mode-versus-role** for the vratmitra experience (#193).
10. **#193** — `/vratmitra/my-vratarthis`: the roster, and the received requests within it.
11. **#22** — accepting a request, as the first feature of that page rather than a separate inbox.

Not the other three vratmitra pages. Build each when there is something it is the only home for.

### Wave 4 — before the invitation goes out

12. **#125 + #124** — now that the application can speak, decide what it should say.
13. **#75**, **#140** — support and removal paths.

---

## Open decisions needed before the work can proceed

1. **Is *vratmitra* a mode or a role?** (#193) The `(vratmitra)/` route group implies a mode;
   `vm-nav-visibility` implies conditional navigation. Most users will be both — a vratmitra is
   also walking their own vrat. This shapes every page built after it. Gates Wave 3.
2. **What search service, and at what cost?** (#194) Local development uses Meilisearch; deployed
   environments have never had one, and the budget log does not carry the line item.
3. **Exercise production uploads?** Creates data in production.
4. **Who are the beta testers?** Whether any are vratmitras determines how hard #22/#193 blocks;
   whether they are Prabodhini staff or outsiders changes the moderation and support answers.

---

## Related

`ops/PROJECT-STATUS.md` for decisions and open threads · `ops/azure-account-facts.md` for what is
deployed · `ops/infra-budget-log.md` for the cost side of #93 and #194 ·
`documentation/22_Platform-Requirements.md` §1 and §7 for search and object storage as stated
requirements.
