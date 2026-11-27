# Plan

Phases run in order. Each has a one-line goal and exit below. Only the phases that `/plan-phase` has broken down get a section with tickets. Decisions live in `claude-notes/decisions.md`.

## Phases

1. **Walking skeleton** (current): job-short works end to end, from the API and normalization through prefill, submit, server screening and storage, to the end screen. Exit: a candidate can answer and submit job-short, the server stores a payload that matches the contract, and a second submission is refused.
2. **Every question type and messy configs**: date, boolean, multi-select and file questions, every screening rule, and full normalization of `bad.json` with logged warnings. Exit: all three jobs render and produce payloads that match the contract, and each `bad.json` fix shows up as a warning.
3. **Step flow and drafts**: steps from easiest to hardest with progress, a review screen with in-place edits, localStorage drafts, full keyboard operation and `track()` events. Exit: an e2e run through job-long, reloading mid-flow, ends with the same payload as an uninterrupted run.
4. **Polish and hand-in**: Instaffo look (Geist, Lucide, the salary pill variant), motion with reduced-motion support, an a11y pass, README and presentation notes. Exit: `/design-check` passes on every screen and the hand-over checklist in `.claude/WORKFLOW.md` is done.

## Phase 1: Walking skeleton

Lanes: T-01, then T-02 ‖ T-03 ‖ T-04, then T-05 ‖ T-06.

Out of plan: a job switcher in the top bar and the questionnaire card (branch `job-switcher`), asked for by the user between T-01 and T-02 to make switching jobs easier during development and demos.

T-02 and T-03 each add one entry to the type → component map that T-01 creates. Whichever merges second rebases over that one line.

Before T-01 can be proved in the browser, a human adds the `/api` proxy to the protected `vite.config.ts` (see the decision "API runs as a separate Hono process behind a Vite proxy").

### T-01 Open job-short and answer the notice-period question, prefilled from the profile

- Status: in review
- Done when:
  - `GET /api/jobs/job-short/questionnaire` returns the questionnaire with every screening rule removed, and with `notice_period` prefilled from `profile.json` (test)
  - An unknown job ID returns 404, and the page shows a "job not found" state (test)
  - While the job loads, the page shows a loading state. A 500 or a network error shows an error that says what happened and offers "Try again", which refetches. Shown at mobile and desktop widths (test, screenshot)
  - The page shows the job title and the notice-period select with its options as written. Types not supported yet aren't rendered. The UI copy is in English because `language` is `en` (test)
  - The prefilled option is marked "from your profile", and the candidate can pick another one by mouse or keyboard (test)
  - `.claude/scripts/dev` starts Vite and the API together, and the page loads at mobile and desktop widths with no console errors (screenshot)
- Touches: src/server (Hono app, job loading, the normalization skeleton, profile prefill), src/shared (job and answer types), src/app (data loading, type → component map, react-intl provider, messages), src/components/Select, src/index.css (Instaffo tokens), .claude/scripts/dev
- Size: ~1,400 lines (the ~420 estimate was low), so split into five stacked PRs
- PRs: five
  - (1) `GET /api/jobs/:id/questionnaire` returns the job's questionnaire with every screening rule removed, and 404 for an unknown ID; `.claude/scripts/dev` starts the API next to Vite
  - (2) The page shows the job's title, a loading skeleton, "job not found" and a plain error; TanStack Query, react-intl, MSW in tests, and the layout components (screens define no CSS)
  - (3) A failed load says what happened and offers "Try again", which refetches; a job without questions says so; React Router serves `/jobs/:jobId`, and a path that names no job shows "job not found"
  - (4) Answer the notice-period select with its options as written, by mouse or keyboard; types not supported yet aren't rendered
  - (5) The notice period is prefilled from the profile and marked "from your profile" until the candidate picks another option
- After: none
- Branch: T-01-api, T-01a-open-job, T-01b-load-errors, T-01c-notice-period, T-01d-profile-prefill
- Outcome: `GET /api/jobs/:id/questionnaire` serves the job's questionnaire with profile prefills. `QuestionnairePage` at `/jobs/:jobId` loads it with TanStack Query, shows a skeleton, "not found", an empty state and errors with "Try again", and renders questions through `getQuestionComponent` (select only). Later tickets: add a map entry and an adapter per type, style only inside `src/components`, mock the network in tests with MSW (`@/test/server`); any console warning or error fails a test. T-02 and T-05 still name `GET /api/jobs/…` for the questionnaire and need the `/questionnaire` path.

### T-02 Answer the salary question in a number field, prefilled from the profile

- Status: in review
- Done when:
  - `GET /api/jobs/job-short/questionnaire` also prefills `salary_expectation` from `salary_expectation.amount` (test)
  - The number field shows the prefilled value marked "from your profile", formatted for the UI locale (95,000 in `en`, 95.000 in `de`), and the answer is kept as an integer (test)
  - Non-digits can't be typed, and the field works by keyboard (test)
- Touches: src/server (profile prefill), src/components/NumberField, src/app (one map entry)
- Size: ~390 lines (planned as two PRs against a feared overrun; it fit in one)
- PRs: one
- After: T-01
- Branch: T-02-salary-number-field
- Outcome: `NumberField` (a generic whole-number input grouped for the locale while typing, digits only) answers numeric questions through the `numeric` map entry, and the server prefills `salary_expectation` from the profile amount when it is an integer within `min`/`max`. `QuestionProps.onChange` now takes `undefined` for a cleared answer, and the page keeps a cleared answer empty instead of falling back to the prefill. T-03's adapter gets the same `onChange` type, and T-06 adds error states to `NumberField` too.

### T-03 Answer the free-text question

- Status: in review
- Done when:
  - A text question shows a single-line field, and one with `multiline: true` shows a textarea that grows with its content (test)
  - The question text appears exactly as the recruiter wrote it, emoji included (test)
- Touches: src/components/TextField, src/app (one map entry)
- Size: ~150 lines
- PRs: one
- After: T-01
- Branch: T-03-free-text-question
- Outcome: `TextField` (a generic single-line field, or with `multiline` a textarea that grows with its text through a CSS grid replica, no JS measuring) answers text questions through the `text` map entry; an emptied field reports `undefined`. Every `ClientQuestion` type now has a component, so the "unsupported type isn't rendered" test sends a `date` question. TextField and NumberField repeat the same label, required marker and annotation markup and CSS: T-05's date field should pull them into a shared generic field component instead of copying them a third time. T-06 adds error states to `TextField` as well.

### T-04 Submit job-short and see the same end screen whatever the result

- Status: in review (PR 1 merged, PR 2 in review)
- Done when:
  - `POST /api/jobs/job-short/prequalification` checks the answers against the normalized job (select value in the options, integer within `min`/`max`, text up to its limit) and returns 422 with field errors when they're invalid (test)
  - The server computes `screening` and stores a payload that matches the README contract in `data/submissions.json`. Optional questions left empty are omitted from it (test)
  - The candidate sees a neutral end screen only after a 2xx response, and it's the same whether they passed or failed. It says the answers were recorded and go to the employer if the candidate fits the job's criteria, never that an application was sent (test). Changed in PR 2 (see decisions): the end screen says whether they passed, so whether the answers were sent to the employer, without naming the question that decided it
  - A 422, a 500 or a network error keeps the form and its answers and shows a visible error above the submit button. Field-level 422 errors come in T-06 (test)
  - While the request is in flight, the submit button shows a pending state and is disabled, so a double click sends one request (test)
  - The response and the client bundle never contain `screening` or a threshold (test). Changed in PR 2: the response carries `{ passed }` only, never the failed ids or a threshold
- Touches: src/server (prequalification route, validation, screening, storage), src/shared (payload types), src/app (submit button, end screen)
- Size: ~1,200 lines with tests (the ~400 estimate was low), split into two PRs by the user's choice. PR 1 is over the 500-line limit and needs the `size-exception` label
- PRs: two
  - (1) Submit and end screen: the POST route stores the answers in the contract payload's shape (without `screening` yet) in `data/submissions.json`, omitting empty optional answers, and always answers an empty 201; the form's submit button has a pending state and sends one request; a 500 or network error keeps the answers and shows an error above the button; a 2xx shows the neutral end screen; the client bundle contains no `screening` or rule. The payload builder has its own edge-case test file
  - (2) The server's decisions: screening (rules parsed beside `client` in `JobQuestion.rules`, `screenAnswers`, `screening` added to the stored payload, its own edge-case test file) and answer validation (each answer checked against the normalized job, 422 with field errors, shown as the same error above the button). The screening code and its 39-case test file were written and reviewed on this branch, so they can be restored from commit `371b7ba` (`src/server/screening.ts`, `src/server/screening.test.ts`, `parseRules` in `normalize.ts`)
- After: T-01
- Branch: claude/t-04-implementation-8525f6 (PR 1, merged), claude/t-04-screening-validation (PR 2)
- Outcome (PR 1): the answers are a prequalification, not an application (see decisions), so the route and types say so. `POST /api/jobs/:id/prequalification` takes `{ answers: { [id]: value } }`, builds `{ job_id, answers }` with `buildPrequalificationPayload` (blank and missing answers left out), and stores `{ candidate_id, payload }` under `talent-4711:<job>` in `data/submissions.json`. It always answers an empty 201. Until PR 2 the stored payload has no `screening`, so it doesn't fully match the contract yet. The form posts through `useSubmitPrequalification`, shows "Submitting…" while in flight, keeps the answers with an `Alert` above the button on any failure, and on a 2xx shows "Your answers have been recorded", saying they go to the employer if the candidate fits; new generic components `Form` and `Alert` (with `--color-danger` tokens). Answers aren't checked against their question yet: PR 2 adds that, ideally sharing one check with `prefill.ts`'s `accepts`. T-05's duplicate check can read the same key.
- Outcome (PR 2): the 201 now answers `{ passed }` and the end screen says whether the answers were sent to the employer (see decisions, which supersede "the same end screen"). Of duplicate question ids `parseJob` keeps the first, with a warning. The stored payload now has `screening`, from `screenAnswers` against `JobQuestion.rules` (numeric rules only; `must_be_true` is logged as ignored until boolean questions exist). Before storing, `findInvalidAnswers` (`src/server/validation.ts`) checks every answer against its normalized question and the route answers 422 `{ error: 'invalid_answers', fields: { [id]: AnswerError } }` (see decisions); prefill uses the same check. The form shows one "Some of your answers can't be accepted" message for a 422. For T-06: `InvalidAnswersError` in `api.ts` is where to read `fields` and map each `AnswerError` code to a field message; `maxTextAnswerLength` (5,000) is shared, so the text field can show the limit. Phase 2's boolean ticket adds `must_be_true` to `ScreeningRules` and a `boolean` case to `findAnswerError`.

### T-05 Can't apply to the same job twice

- Status: in progress
- Done when:
  - A second POST for the same candidate and job returns 409 and doesn't change the stored payload, including two requests sent at once (test)
  - `GET /api/jobs/:id` says the job is already completed, and reopening it shows an "already completed" screen instead of the form (test)
  - An e2e run opens job-short, changes the salary, submits, reloads and sees "already completed" (e2e)
- Touches: src/server (storage duplicate check, job status), src/app (completed screen), e2e
- Size: ~200 lines
- PRs: one
- After: T-04
- Branch: claude/t-05-already-completed-2a31c8

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
