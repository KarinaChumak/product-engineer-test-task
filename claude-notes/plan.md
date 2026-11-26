# Plan

Phases run in order. Each has a one-line goal and exit below. Only the phases that `/plan-phase` has broken down get a section with tickets. Decisions live in `claude-notes/decisions.md`.

## Phases

1. **Walking skeleton** (current): job-short works end to end, from the API and normalization through prefill, submit, server screening and storage, to the end screen. Exit: a candidate can answer and submit job-short, the server stores a payload that matches the contract, and a second submission is refused.
2. **Every question type and messy configs**: date, boolean, multi-select and file questions, every screening rule, and full normalization of `bad.json` with logged warnings. Exit: all three jobs render and produce payloads that match the contract, and each `bad.json` fix shows up as a warning.
3. **Step flow and drafts**: steps from easiest to hardest with progress, a review screen with in-place edits, localStorage drafts, full keyboard operation and `track()` events. Exit: an e2e run through job-long, reloading mid-flow, ends with the same payload as an uninterrupted run.
4. **Polish and hand-in**: Instaffo look (Geist, Lucide, the salary pill variant), motion with reduced-motion support, an a11y pass, README and presentation notes. Exit: `/design-check` passes on every screen and the hand-over checklist in `.claude/WORKFLOW.md` is done.

## Phase 1: Walking skeleton

Lanes: T-01, then T-02 ‖ T-03 ‖ T-04, then T-05 ‖ T-06.

T-02 and T-03 each add one entry to the type → component map that T-01 creates. Whichever merges second rebases over that one line.

Before T-01 can be proved in the browser, a human adds the `/api` proxy to the protected `vite.config.ts` (see the decision "API runs as a separate Hono process behind a Vite proxy").

### T-01 Open job-short and answer the notice-period question, prefilled from the profile

- Status: todo
- Done when:
  - `GET /api/jobs/job-short` returns the job with every screening rule removed, and with `notice_period` prefilled from `profile.json` (test)
  - An unknown job ID returns 404, and the page shows a "job not found" state (test)
  - While the job loads, the page shows a loading state. A 500 or a network error shows an error that says what happened and offers "Try again", which refetches. Shown at mobile and desktop widths (test, screenshot)
  - The page shows the job title and the notice-period select with its options as written. Types not supported yet aren't rendered. The UI copy is in English because `language` is `en` (test)
  - The prefilled option is marked "from your profile", and the candidate can pick another one by mouse or keyboard (test)
  - `.claude/scripts/dev` starts Vite and the API together, and the page loads at mobile and desktop widths with no console errors (screenshot)
- Touches: src/server (Hono app, job loading, the normalization skeleton, profile prefill), src/shared (job and answer types), src/app (data loading, type → component map, react-intl provider, messages), src/components/Select, src/index.css (Instaffo tokens), .claude/scripts/dev
- Size: ~420 lines
- PRs: one
- After: none
- Branch: none yet

### T-02 Answer the salary question in a number field, prefilled from the profile

- Status: todo
- Done when:
  - `GET /api/jobs/job-short` also prefills `salary_expectation` from `salary_expectation.amount` (test)
  - The number field shows the prefilled value marked "from your profile", formatted for the UI locale (95,000 in `en`, 95.000 in `de`), and the answer is kept as an integer (test)
  - Non-digits can't be typed, and the field works by keyboard (test)
- Touches: src/server (profile prefill), src/components/NumberField, src/app (one map entry)
- Size: ~200 lines
- PRs: one
- After: T-01
- Branch: none yet

### T-03 Answer the free-text question

- Status: todo
- Done when:
  - A text question shows a single-line field, and one with `multiline: true` shows a textarea that grows with its content (test)
  - The question text appears exactly as the recruiter wrote it, emoji included (test)
- Touches: src/components/TextField, src/app (one map entry)
- Size: ~150 lines
- PRs: one
- After: T-01
- Branch: none yet

### T-04 Submit job-short and see the same end screen whatever the result

- Status: todo
- Done when:
  - `POST /api/jobs/job-short/applications` checks the answers against the normalized job (select value in the options, integer within `min`/`max`, text up to its limit) and returns 422 with field errors when they're invalid (test)
  - The server computes `screening` and stores a payload that matches the README contract in `data/submissions.json`. Optional questions left empty are omitted from it (test)
  - The candidate sees a neutral end screen only after a 2xx response, and it's the same whether they passed or failed (test)
  - A 422, a 500 or a network error keeps the form and its answers and shows a visible error above the submit button. Field-level 422 errors come in T-06 (test)
  - While the request is in flight, the submit button shows a pending state and is disabled, so a double click sends one request (test)
  - The response and the client bundle never contain `screening` or a threshold (test)
- Touches: src/server (applications route, validation, screening, storage), src/shared (payload types), src/app (submit button, end screen)
- Size: ~400 lines
- PRs: one
- After: T-01
- Branch: none yet

### T-05 Can't apply to the same job twice

- Status: todo
- Done when:
  - A second POST for the same candidate and job returns 409 and doesn't change the stored payload, including two requests sent at once (test)
  - `GET /api/jobs/:id` says the job is already completed, and reopening it shows an "already completed" screen instead of the form (test)
  - An e2e run opens job-short, changes the salary, submits, reloads and sees "already completed" (e2e)
- Touches: src/server (storage duplicate check, job status), src/app (completed screen), e2e
- Size: ~200 lines
- PRs: one
- After: T-04
- Branch: none yet

### T-06 See input errors before submitting

- Status: todo
- Done when:
  - An empty required field shows an error with colour, an icon and text when the candidate tries to submit, and focus moves to the first error (test)
  - A number outside the field's `min`/`max` shows a format message that doesn't reveal any screening threshold (test)
  - The server's 422 field errors are shown on the matching fields the same way (test)
  - Errors are linked to their field with `aria-describedby`, and the field is marked `aria-invalid` (test)
  - The error states match the "Fehler- & Feldzustände" board on the design canvas at mobile and desktop widths (screenshot)
- Touches: src/components (Select, NumberField, TextField error states, a shared FieldError), src/app/validation
- Size: ~280 lines
- PRs: one
- After: T-02, T-03, T-04
- Branch: none yet
