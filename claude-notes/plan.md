# Plan

Phases run in order. Each has a one-line goal and exit below. Only the phases that `/plan-phase` has broken down get a section with tickets. Decisions live in `claude-notes/decisions.md`.

## Phases

1. **Walking skeleton**: job-short works end to end, from the API and normalization through prefill, submit, server screening and storage, to the end screen. Exit: a candidate can answer and submit job-short, the server stores a payload that matches the contract, and a second submission is refused.
2. **Every question type and messy configs** (current): date, boolean, multi-select and file questions, every screening rule, and full normalization of `bad.json` with logged warnings. Exit: all three jobs render and produce payloads that match the contract, and each `bad.json` fix shows up as a warning.
3. **Step flow and drafts**: steps from easiest to hardest with progress, a review screen with in-place edits, localStorage drafts, full keyboard operation and `track()` events. Exit: an e2e run through job-long, reloading mid-flow, ends with the same payload as an uninterrupted run.
4. **Polish and hand-in**: Instaffo look (Geist, Lucide, the salary pill variant), motion with reduced-motion support, an a11y pass, README and presentation notes. Exit: `/design-check` passes on every screen and the hand-over checklist in `.claude/WORKFLOW.md` is done.

## Phase 1: Walking skeleton

Lanes: T-01, then T-02 ‖ T-03 ‖ T-04, then T-05 ‖ T-06, then T-07.

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

- Status: in review
- Outcome: `SubmissionStore.saveIfNew` stores one prequalification per candidate and job (checked and written in one queued step), a second POST gets `409 already_completed`, and `GET /api/jobs/:id/questionnaire` carries `isCompleted`, which shows an "already completed" screen that doesn't reveal the result. `.claude/scripts/e2e` now runs on one worker, and e2e specs that answer job-short clear its submission first with `e2e/submissions.ts`; later specs that submit a job must do the same.
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

- Status: in review
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
- Branch: claude/t-06-field-errors-d34c23
- Outcome: Submit runs the shared `findInvalidAnswers` (`src/shared/answerValidation.ts`) and the server's 422 codes go through the same path: `Select`, `NumberField` and `TextField` take an `error`, shown by the new `FieldError`, and `Form`'s `invalidFocusRequest` focuses the first invalid field. Messages are `answerError.<code>` in `en` and `de`. A new question type (T-05's date, Phase 2's boolean) adds its case to `findAnswerError` and passes `error` through its adapter. The three fields still repeat the label, annotation and error markup; the shared field component T-03 suggested is still to do.

### T-07 See a field's error as soon as the candidate leaves it

Asked for by the user after T-06's PR was opened. It didn't fit in that PR's size limit.

- Status: in review
- Done when:
  - Leaving a field the candidate touched (focus moves to another question or out of the form) shows its error the same way T-06 does, with no submit (test)
  - Once a field shows its error, the error updates as the candidate types and disappears as soon as the answer is valid (test)
  - Fields the candidate hasn't touched show no error until they submit; submit still shows every error and focuses the first (test)
  - Opening a select and picking an option doesn't count as leaving it, so the list never opens with an error under it (test)
  - The server's 422 errors still show on their fields until that answer changes (test)
- Touches: src/components (an `onBlur` on Select, NumberField and TextField; Select ignores a blur while its list is open), src/app (`QuestionList` derives errors from `findInvalidAnswers` on every render, shown for touched fields or after a submit, replacing the stored client errors), the question adapters
- Size: ~150 lines
- PRs: one
- After: T-06
- Branch: claude/t-07-blur-errors-9253f7
- Outcome: Select, NumberField and TextField take an `onBlur` (Select ignores the blur while its list is open), and `QuestionProps` requires `onBlur`. `QuestionList` runs `findInvalidAnswers` on every render and shows a question's error once it's in `touchedIds` or after a submit; only the server's 422 errors are stored, until that answer changes. A new question type (the date field) passes `onBlur` through to its field.

## Phase 2: Every question type and messy configs

Lanes: T-08a ‖ T-09 ‖ T-10, then T-08b ‖ T-11, then T-12, then T-13, then T-14.

Planned with T-07 counted as done. Every ticket that adds or changes a question adapter waits for T-07 to merge, because T-07 gives each adapter an `onBlur`. T-10 touches only the server's prefill, so it can start now.

T-08a and T-11 both add a type to `ClientQuestion`, `normalizeQuestion`, `findAnswerError` and the adapter map, so they run one after the other. T-08b changes only `parseRules` and screening, so it can run beside T-11. T-09 changes only the select adapter and adds a component, so it runs beside T-08a; whichever of T-08a and T-09 merges second rebases over the message files.

Settled while planning, to record in `decisions.md` by the ticket that needs it (the missing-answer rule moved to T-08b's section):

- A field's own `min`/`max` is input validation, never a screen-out, even when the recruiter used it as a floor (`react_years`, `min: 5`). The field says "between 5 and 50", which the question text already says. T-14 records it.

### T-08a Answer yes/no questions

Split from T-08 ("Answer yes/no questions, and `must_be_true` screens them") when it came to ~550 lines; the screening half is T-08b.

- Status: in review
- Done when:
  - A boolean question shows two choices, "Yes" and "No" in the UI language ("Ja", "Nein" in `de`), with neither picked at first, and they work by keyboard (arrow keys move, as in a radio group) (test)
  - The answer is sent and stored as a JSON `true` or `false`, and a required boolean left unanswered shows the `required` error (test)
  - job-long's `eu_work_permit` and `willing_to_relocate` render, at mobile and desktop widths (screenshot)
- Touches: src/components (a new `RadioGroup` on `@radix-ui/react-radio-group`), src/app (a `BooleanQuestion` adapter, its map entry, "Yes"/"No" messages), src/shared (`BooleanQuestion` in `ClientQuestion`, a `boolean` case in `findAnswerError`), src/server (`normalizeQuestion` for `boolean`)
- Size: ~440 lines (RadioGroup with CSS and tests ~250, adapter, copy and page tests ~120, shared type and check with tests ~30, normalize with tests ~20). Over the ~300 estimate, under the 500 limit
- PRs: one
- After: T-07
- Branch: T-08-boolean-questions
- Outcome: `RadioGroup` (a generic labelled set of one-pick options, side by side as touch-target tiles, on Radix) answers boolean questions through the `boolean` map entry; `BooleanQuestion` maps its radios to JSON `true`/`false`. The server keeps `boolean` questions, and `findAnswerError` refuses anything but a JSON boolean as `wrong_type`. `RadioGroup` puts `aria-invalid` and `aria-describedby` on the radiogroup, which Radix makes focusable, so `Form`'s focus-the-first-invalid-field lands on its first radio; its `onBlur` fires only when focus leaves the group. `must_be_true` is still ignored with its warning on every type, boolean included, until T-08b. `src/test/setup.ts` now stubs `ResizeObserver`, which Radix RadioGroup calls inside a form. Radix moves focus a tick after an arrow key and picks only while the key is down, so keyboard tests hold it (`{ArrowDown>}`). In an optional group, clicking the picked option again (or Space on it) clears it, so an optional yes/no answer can go back to unanswered and is left out of the payload; a required group keeps its pick.

### T-08b `must_be_true` screens yes/no answers

- Status: todo
- Done when:
  - `must_be_true` on a boolean question is kept as a rule: `false` fails it, and so does no answer to an optional question with the rule. `must_be_true` on any other type is still ignored with a warning (test)
- Settled while planning, to record in `decisions.md` here: a missing answer fails a question's rule, as the README says (the open question in `product.md`). `screenAnswers` already does this for numeric rules; T-08b keeps it for `must_be_true`. Every rule question in the three jobs is required anyway.
- Touches: src/server (`parseRules` and `mustBeTrue` in `ScreeningRules`, `screenAnswers`, their tests, job-long's and job-bad's screening tests), claude-notes/decisions.md
- Size: ~110 lines. The code and tests were written on T-08's branch and can be restored from branch `T-08b-must-be-true-wip`, commit `90fab5b` (`src/server/normalize.ts` `parseRules`, `src/server/screening.ts`, `src/server/screening.test.ts`, the `must_be_true` cases in `normalize.test.ts` and `app.test.ts`)
- After: T-08a
- Branch: none yet

### T-09 Pick several options in a multi-choice question

- Status: in review
- Done when:
  - A select question with `max_choices` above 1 shows its options as checkboxes and says how many can be picked ("Pick up to 2") (test)
  - Once `max_choices` options are picked, the others are disabled until one is unpicked. When `max_choices` is at least the number of options, every option can be picked and no limit is shown (test)
  - The answer is sent as a list and stored in the payload under `values`; unpicking everything leaves an optional question out of the payload (test)
  - The checkboxes work by keyboard and are grouped under the question as their legend (test)
  - job-long's `focus_areas` renders at mobile and desktop widths (screenshot)
- Touches: src/components (a new `CheckboxGroup` on `@radix-ui/react-checkbox`), src/app (the select adapter picks `CheckboxGroup` for multi-choice and drops the one-pick stand-in, "Pick up to" messages)
- Size: ~490 lines (the ~260 estimate was low: CheckboxGroup with CSS and tests came to ~290, the page tests to ~120)
- After: T-07
- Branch: T-09-multi-choice
- Outcome: `CheckboxGroup` (a `fieldset` whose `legend` is the label, one Radix checkbox per option in a full-row `label`) answers select questions with `maxChoices` above 1; `SelectQuestion` picks it over `Select`, and the one-pick stand-in is gone. Picks are kept in option order, and no picks is sent as `undefined`, so an optional question is left out. Below the option count, `maxChoices` disables the unchecked options once reached and shows "Pick up to {maxChoices}" as the group's description; at or above it there's no limit, so job-bad's `tech_stack` already works before T-14 caps it. `onBlur` fires only when focus leaves the group, and an error marks every checkbox `aria-invalid`, so `Form` focuses the first. `src/test/setup.ts` stubs `ResizeObserver`, which jsdom lacks and Radix Checkbox calls inside a form. A group can't take `aria-required`, so a required one adds a visually hidden `requiredLabel` ("required", "Pflichtfeld") to its legend beside the `aria-hidden` `*`. Payload storage under `values` was already covered by the server tests.

### T-10 job-long's German level and years of experience come prefilled from the profile

- Status: todo
- Done when:
  - `GET /api/jobs/job-long/questionnaire` prefills `german_level` (`B1`) from the `languages` entry for `de`, and `years_of_experience` (6) from the profile. `english_level` and `city` are mapped the same way, as the README's profile-field table lists them (test)
  - A profile value the question can't take (a level that isn't an option, a number out of range) isn't prefilled, as before. An unknown `profile_field` is logged as a warning once, when the job is parsed (test)
  - Both questions show "from your profile" on job-long (screenshot)
- Touches: src/server (prefill.ts, `Profile`, the profile-field warning in normalize.ts)
- Size: ~130 lines
- After: none
- Branch: none yet

### T-11 Pick a start date within the job's range

- Status: todo
- Done when:
  - A date question shows a date field, and its answer is sent and stored as `YYYY-MM-DD` (test)
  - `min` and `max` are inclusive, and `"today"` is resolved on the server to the server's current date when the questionnaire is built, so the client gets plain dates. A date outside the range, or not a real date, is refused with a message naming the allowed range in the UI locale's date format (test)
  - A `min` after `max`, or a value that isn't a date or `"today"`, is dropped with a warning (test)
  - The field marks a required question, shows its error, and moves focus on submit like the other fields, through a shared `Field` component that holds the label, annotation and error wiring (test)
  - job-long's `starting_date` renders at mobile and desktop widths (screenshot)
- Touches: src/components (a new `DateField` on the native date input, a new `Field` used by `DateField`), src/app (a `DateQuestion` adapter, its map entry, date error messages), src/shared (`DateQuestion`, a `date` case in `findAnswerError`), src/server (`normalizeQuestion` for `date`, resolving `"today"`)
- Size: ~300 lines (Field ~70, DateField with CSS and tests ~110, adapter and copy ~35, shared type and check with tests ~40, normalize with tests ~50). Moving `TextField`, `NumberField` and `Select` onto `Field` is left to Phase 4's a11y pass, to keep this under the limit
- After: T-08a
- Branch: none yet

### T-12 Attach a file, and it's sent in the payload

- Status: todo
- Done when:
  - A file question shows a button that opens the file picker; the chosen file's name and size are shown, with a way to remove it, by mouse or keyboard (test)
  - The file is read in the browser and sent as `{ content_type, data, file_name }`, with `data` base64, and stored that way in the payload (test)
  - A required file question with no file shows the `required` error; an optional one without a file is left out of the payload (test)
  - The server accepts a body big enough for a 5 MB file encoded as base64, and refuses a bigger body with 413 (test)
  - job-bad's `cover_letter` renders at mobile and desktop widths (screenshot)
- Touches: src/components (a new `FileField`), src/app (a `FileQuestion` adapter that reads the file, its map entry, messages), src/shared (`FileAnswer` in `AnswerValue`, `FileQuestion`, a `file` case in `findAnswerError` for the shape only), src/server (`normalizeQuestion` for `file`, the request shape check, the body limit)
- Size: ~300 lines
- After: T-11
- Branch: none yet

### T-13 A file of the wrong type or over 5 MB is refused

- Status: todo
- Done when:
  - Picking a file that isn't PDF, DOCX, PNG or JPG, or is over 5 MB, shows an error on the field right away, before it is read or sent, saying which types and size are allowed (test)
  - The server refuses the same files by their content type and decoded size, and a `data` that isn't base64, with the `AnswerError` codes the client shows (test)
  - The file picker offers only the allowed types (test)
- Touches: src/shared (the file case in `findAnswerError`, new `AnswerError` codes, the allowed types and size), src/components/FileField (an `accept`), src/app (the adapter's check on pick, messages)
- Size: ~170 lines
- After: T-12
- Branch: none yet

### T-14 job-bad opens with every repair logged, and all three jobs submit contract payloads

- Status: todo
- Done when:
  - Parsing `jobs/bad.json` logs one warning per repair, and a test lists them all: the second `notice_period`, `must_be_true` on the text `country`, the unknown `rating` type, `tech_stack`'s `max_choices` capped at its 5 options (test)
  - The defensive repairs from the kickoff decision each have a test and a warning: a numeric or date `min` above `max` (the range is dropped), a select without options (the question is dropped), question text over 255 characters (cut to 255) (test)
  - A field's own `min`/`max` is checked as input, never as a screen-out: `react_years` refuses 3 as out of range, and that refusal is never a screening failure (test)
  - An e2e run answers and submits job-long and job-bad, and each stored payload matches the README contract: every answer shape, `values` for multi-choice, optional empty answers left out, and `screening` (e2e)
- Touches: src/server (normalize.ts repairs), e2e (job-long and job-bad specs, clearing their submissions first like job-short's)
- Size: ~250 lines
- After: T-08a, T-08b, T-09, T-10, T-11, T-12, T-13
- Branch: none yet
