# Instaffo company questions

## Problem

When candidates apply on Instaffo, companies add their own screening questions. Recruiters write these configs by hand, so they contain duplicate IDs, unknown types, rules on the wrong type and impossible ranges (see `jobs/bad.json`). Today's flow asks again for things the profile already knows. It also has no review step, and "Bewerbung starten" sends the application right away. Candidates drop out or apply by mistake. If screening runs in the browser, anyone can send `passed: true`.

## Users

- **Candidate** (`talent-4711` in `profile.json`): wants to answer quickly, see what the profile already filled in, fix answers before sending, and not lose work on reload. Learns whether they passed, so they aren't left wondering if the employer has their answers, but never sees a threshold or which question decided it.
- **Recruiter / company** (indirect): gets a payload that matches the contract, with a screening result they can trust, from a config that was repaired rather than rejected.

## Principles

- The server owns the config and the screening. The client only renders questions and checks input format. It never sees a rule or a threshold.
- Ask only what we don't know: profile answers are prefilled and only confirmed.
- Repair, don't drop: a bad config is normalized deterministically and every fix is logged, so the payload still matches the contract.
- Nothing leaves the browser until an explicit submit. Drafts stay local and are cleared after submit.
- The end screen says whether the candidate passed: if so, their answers were sent to the employer; if not, they won't be. It never names the question that decided it.
- The answers are a prequalification, not an application: they reach the employer only if the candidate passes screening. The UI never calls them an application.

## Scope

- `GET /api/jobs/:id`: the normalized job, client-safe, with profile prefill.
- A question flow for every README type (text, date, boolean, numeric, select, file), grouped into steps from easiest to hardest, with progress, a review screen and in-place edits.
- `POST /api/jobs/:id/prequalification`: validates the answers again, computes `screening`, builds and stores the contract payload, and refuses a second submission.
- UI in `de` or `en` following `job.language`. Recruiter text is never translated.
- Instaffo's input look: tokens #5e2f82, #e2bdff, #f5f5f7, #d3d4d6, with Geist and Lucide. Keyboard-operable throughout.
- A typed `track()` with step events. No answer values in events, and no screening result.

## Out of scope

- Instaffo's standard pre-qualification questions: they're a different product surface. Noted for the presentation.
- Recruiter-side config editing or linting: config quality belongs there, but this task is the candidate side.
- Auth and multiple candidates: the candidate is fixed to `profile.json`.
- Prefill from a CV, per-question language, an LLM lint of recruiter wording: future ideas for the presentation.
- SSR, a global state library, CSS-in-JS (repo non-goals).

## Open questions

- `react_years` has `min: 5`. Is an input below `min` a screen-out (a documented deviation) or rejected as invalid input? Sending `min` to the client also reveals the floor. Settle before the numeric-rules ticket in Phase 2.
- Settled in T-08b (see decisions): a missing answer on a question with a rule fails the rule, as the README says.
- Which salary "Aus deinem Profil" pill variant (A, B or E) to use: a design-canvas review in Phase 4.
- A required salutation (`bad.json`) is a GDPR question. Raise it in the presentation; keep it as configured for now.
