# Triage archive — historical record

Append-only. Items here were triaged into GitHub Issues and are kept for provenance, not for
planning. **Nothing here is actionable** — the live register is `PROJECT-STATUS.md`.

Same principle as `openspec/changes/archive/`: history is valuable, but it should not sit in
the file you read to decide what to do next.

---

---
Triaged 2026-07-19 → GitHub Issues (beta feedback + backlog.md batch):

Beta feedback (prod, reported by testers):
- Vratmitra invitation not visible to invited VM; notification link wrong → #22 (p1, defect) — FIXED, live and verified (PR #52). Two root causes: "Platform Invite" was offered even for an existing found user (silently skipped notification + relationship creation); the in-app notification link map had drifted to /dashboard instead of /invitations.
- Half-finished weakness test can't be resumed → #23 (p1, defect) — FIXED, live and verified (PR #52). The resume mechanism itself was correct; the real gap was no confirmation before an irreversible early submit — now confirms first when sentences are left blank.
- Display both study weakness and work on journey on dashboard side by side (om, on behalf of Nachiket Nitsure) → merged into #24 (p1, needs-spec) — still open, largest remaining item
- en/mr toggle: "When selected is english, the toggle should show मराठी and vice versa" → #25 (p2, defect) — FIXED, live and verified
- "अँप App word wrong" — ऍप हा शब्द चुकीचा दिसतो → #26 (p2, content/i18n) — FIXED, live and verified. Corrected two non-standard spellings (अॅप/अ‍ॅप → ॲप); low confidence, worth a native-speaker check.
- Profile page on mobile not correct looking — "Header not looking good.. and on mobile it's moving" → #27 (p2, defect) — FIXED, live and verified
- Journey<Statement — "Sub-titles in english and marathi is fit to window on mobile website, but the title header is not, so it over extend to the left side beyond" → #28 (p2, defect) — FIXED, live and verified
- Adding vratmitra — "Can't add with username only, email address is required... Username is more convenient?" → #29 (p2, enhancement) — FIXED, live and verified (also fixed username/name search silently returning nothing since Meili isn't deployed)
- Weakness test UI — "Preview option(submit) is big, instead next should be bigger/colour coded similarly" → #30 (p2, ux) — FIXED, live and verified; follow-up fix for a jarring identical-color regression also shipped (PR #48)
- Weakness Test — "Auto next will be convenient. You can keep it on toggle, so that those who want to opt out/in can" → #35 (p3, enhancement) — FIXED, live and verified
- Logo - 2 diff for 2 languages → #36 (p3, content) — still open, needs the mr-locale logo asset from you

## Backlog.md items (original wording preserved):

1. Beta mode, the observations inside the beta feedback modal should 1 - show who raised that observation (issue or improvement whatever), 2. have a toggle to show details of all observations as well or not, if not is chosen, then clicking/tapping on an observation should expand that entry to show the details. Also a new mode
→ #31 (p2, enhancement) — FIXED, live and verified. "Also a new mode" clarified as two new feedback types (Modification, Addition), also shipped.

3. Study = What is veervrat = virtues & weaknesses will be a sub part of what is veervrat
- Also pothi
- Also walkthrough and process (prakriya 2.0 doc)

AND

Work on/find weakness & work on journey should be separate things (ref navbar)
→ merged into #24, Home / Navbar / Study IA redesign (p1, needs-spec)

4. Hastapusika text move into app,
- passage (2) of hastapustika - Veervratachi suruvaat - atta ahe tasa aani english translation atta move karun taakne to the app
- gunancha varnana - atta ahe tasa aani english translation atta move karun taakne to the app - requires proper manual intervention for structuring.
- similarly anything else that can be added.
→ #38 (p3, content)

5. Veervrat Prakriya 2.0 -> Process
- Refer to that docx file for walkthrough design
→ #39 (p3, needs-spec)

6. Proper navigation - design point open
- like breadcrumbs,
- or, if i open a weakness, and then click on a suggested virtue in that, it takes me to that virtue's page, then i should be able to come back to the weakness page, (and from there do we want user to also be able to go to the parent page of that virtue's details page)  for that do we want breadcrumbs, or should the virtues details page becoma a modal/popup insetad of entirely navigating to that page and so on things we need to discuss in detail.
→ #33 (p2, needs-spec)

8. Home -
- (i) Study, (ii) Find weakness, (iii) Work on journey, (iv) (Updated) Community + My experiencess
→ merged into #24, Home / Navbar / Study IA redesign (p1, needs-spec)

9. Navbar
- Call as Home page insead of dashboard
- Keep (new version) study
- add work on weakness
- keep journey
- keep pothi
- merge community and my experiences - Think deeper about this stuff.
→ merged into #24, Home / Navbar / Study IA redesign (p1, needs-spec)

10. Community + my experiences
Deeper redesign/design thinking - blogs vs experiences, system pushed (aka prabodhini/nachiket dada) blogs for everyone vs general everyone's data - feed.
→ #37 (p3, needs-spec)

99. (ref 10.) in logging experience - if friends or public - option to anonymise/generalise experience should be shown
→ merged into #37

100. Building Admin Dashboard, (and thinking about ACR high etc)
→ #40 (p3, needs-spec)

101. Moderation for public facing data - filters/vulgarity etc checks.
→ #34 (p2, enhancement)

102. 4-6 yrs consistently veervrat var kaam karknaryanna tyanchya pravasacha adhava deun report generate hoil jo cv madhye add karta yeil asa
→ #41 (p3, deferred)

Runtime work
- Analyse lang changes for content which has multiple keys - ability to select all
→ #32 (p2, enhancement) — FIXED, live and verified. Clicks now auto-resolve to the exact
  key via DOM/route context when possible (no picker shown); genuine ties fall back to
  multi-select checkboxes for a batch edit.

---
Triaged 2026-07-04 → GitHub Issues:
- en↔mr toggle very slow (local + deployed) → #7
- profile view/edit incl. birthdate → #1
- link Google account after credentials login → #2
- en/mr toggle broken on deployed app → #3
- hydration mismatch on /onboarding → #4 (closed: browser-extension artifact, not our bug)
- GH Actions integration workflow failing → #6 (fixed same day: dummy GOOGLE_* env in CI)
- feedback widget overlaps bottom pill nav on mobile/tablet → #8 (fixed, confirmed on mobile)
- toggle router.refresh() ~300–500ms optimization → #9 (deferred/p3, act only if testers complain)

---
