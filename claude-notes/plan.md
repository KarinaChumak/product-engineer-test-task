# Plan

Phases run in order. Each has a one-line goal and exit below. Only the phases that `/plan-phase` has broken down get a section with tickets, and a phase moves to `plan-archive.md` once all its tickets are merged. Decisions live in `claude-notes/decisions.md`.

## Phases

1. **Walking skeleton**: job-short works end to end, from the API and normalization through prefill, submit, server screening and storage, to the end screen. Exit: a candidate can answer and submit job-short, the server stores a payload that matches the contract, and a second submission is refused.
2. **Every question type and messy configs**: date, boolean, multi-select and file questions, every screening rule, and full normalization of `bad.json` with logged warnings. Exit: all three jobs render and produce payloads that match the contract, and each `bad.json` fix shows up as a warning.
3. **Step flow and drafts** (current): steps from easiest to hardest with progress, a review screen with in-place edits, localStorage drafts, full keyboard operation and `track()` events. Exit: an e2e run through job-long, reloading mid-flow, ends with the same payload as an uninterrupted run.
4. **Polish and hand-in**: Instaffo look (Geist, Lucide, the salary pill variant), motion with reduced-motion support, an a11y pass, README and presentation notes. Exit: `/design-check` passes on every screen and the hand-over checklist in `.claude/WORKFLOW.md` is done.

Finished phases are in [plan-archive.md](plan-archive.md): Phase 1.

## Phase 2: Every question type and messy configs

From T-12c on, tickets are built a feature at a time and reviewed as stacked PRs, one per ticket (see "The rest of the task is built in features and reviewed as stacked PRs" in `decisions.md`). The lanes below are history.

Lanes: T-08a ‖ T-09 ‖ T-10, then T-08b ‖ T-11a, then T-11b ‖ T-12a, then T-12b, then T-12c, then T-13, then T-14.

T-11 was split into T-11a (the date field) and T-11b (its range). T-12 needs only T-11a, since both add a question type; T-11b touches the date question alone, so it runs beside T-12, and whichever merges second rebases over the message files.

Planned with T-07 counted as done. Every ticket that adds or changes a question adapter waits for T-07 to merge, because T-07 gives each adapter an `onBlur`. T-10 touches only the server's prefill, so it can start now.

T-08a and T-11 both add a type to `ClientQuestion`, `normalizeQuestion`, `findAnswerError` and the adapter map, so they run one after the other. T-08b changes only `parseRules` and screening, so it can run beside T-11. T-09 changes only the select adapter and adds a component, so it runs beside T-08a; whichever of T-08a and T-09 merges second rebases over the message files.

Settled while planning, to record in `decisions.md` by the ticket that needs it (the missing-answer rule moved to T-08b's section):

- A field's own `min`/`max` is input validation, never a screen-out, even when the recruiter used it as a floor (`react_years`, `min: 5`). The field says "between 5 and 50", which the question text already says. T-14 records it.

### T-08a Answer yes/no questions

Split from T-08 ("Answer yes/no questions, and `must_be_true` screens them") when it came to ~550 lines; the screening half is T-08b.

- Status: done (merged)
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

- Status: done (merged)
- Done when:
  - `must_be_true` on a boolean question is kept as a rule: `false` fails it, and so does no answer to an optional question with the rule. `must_be_true` on any other type is still ignored with a warning (test)
- Settled while planning, recorded in `decisions.md`: a missing answer fails a question's rule, as the README says (the open question in `product.md`, now marked settled).
- Touches: src/server (`parseRules` and `mustBeTrue` in `ScreeningRules`, `screenAnswers`, their tests, job-long's and job-bad's screening tests), claude-notes/decisions.md
- Size: ~110 lines, restored from T-08's branch (commit `90fab5b`)
- After: T-08a
- Branch: T-08b-must-be-true
- Outcome: `parseRules` keeps `must_be_true: true` on a boolean question as `ScreeningRules.mustBeTrue`; a value that isn't `true`, or the rule on another type, is ignored with a warning. `screenAnswers` fails anything but a JSON `true` under it, a missing answer included, so job-long now screens on `eu_work_permit` and job-bad on `onsite` and `driving_license` (its `must_be_true` on the text `country` stays ignored). Main's `it.todo` for job-long's permit is gone. T-14's e2e payloads for job-long and job-bad need `true` for those questions to pass screening. Also fixed: `app.test.ts`'s test for two submissions sent at once assumed the first request wins and failed about 1 run in 3; it now accepts either winner and checks its answers are the ones kept.

### T-09 Pick several options in a multi-choice question

- Status: done (merged)
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

- Status: done (merged)
- Done when:
  - `GET /api/jobs/job-long/questionnaire` prefills `german_level` (`B1`) from the `languages` entry for `de`, and `years_of_experience` (6) from the profile. `english_level` and `city` are mapped the same way, as the README's profile-field table lists them (test)
  - A profile value the question can't take (a level that isn't an option, a number out of range) isn't prefilled, as before. An unknown `profile_field` is logged as a warning once, when the job is parsed (test)
  - Both questions show "from your profile" on job-long (screenshot)
- Touches: src/server (prefill.ts, `Profile`, the profile-field warning in normalize.ts)
- Size: ~130 lines
- After: none
- Branch: T-10-prefill-job-long-profile

### T-11a Pick a start date

Split from T-11 ("Pick a start date within the job's range") when it came to ~450 lines; the range half is T-11b.

- Status: done (merged)
- Done when:
  - A date question shows a date field, and its answer is sent and stored as `YYYY-MM-DD`. A value that isn't a real calendar date (`2026-02-30`, `1 May`) is refused as `not_a_date` (test)
  - The field marks a required question, shows its error, and moves focus on submit like the other fields, through a shared `Field` component that holds the label, annotation and error wiring (test)
  - A date question's `min` and `max` are ignored with a warning until T-11b (test)
  - job-long's `starting_date` renders at mobile and desktop widths (screenshot)
- Touches: src/components (a new `Field`, a new `DateField` on the native date input inside it), src/app (a `DateQuestion` adapter, its map entry, the `not_a_date` message), src/shared (`DateQuestion`, `not_a_date`, a `date` case in `findAnswerError`), src/server (`normalizeQuestion` for `date`)
- Size: ~290 lines (Field with CSS and tests ~100, DateField with CSS and tests ~80, shared type and check with tests ~45, normalize and API tests ~45, adapter, copy and page tests ~65). Moving `TextField`, `NumberField` and `Select` onto `Field` is left to Phase 4's a11y pass
- After: T-08a
- Branch: T-11-start-date-field
- Outcome: Came to ~450 lines (component tests and CSS ran over), kept as one PR by the user's choice. `Field` (label, required `*`, annotation, `FieldError`, and the control's `id`/`required`/`aria-*` through a render function) is the base for new single-control fields; `DateField` is `<input type="date">` on it, so the browser shows the date in its own format (decided in `decisions.md`, superseding the locale rule for this field). The server keeps `date` questions and logs on every request that job-long's `min: "today"` is ignored; T-11b replaces that warning. `findAnswerError` refuses a date that isn't a real `YYYY-MM-DD` as `not_a_date` (`isCalendarDate` in `src/shared/answerValidation.ts`). A date input has no ARIA role, so tests find it by its label with `exact: false` (the label text holds the hidden `*`). T-12's `FileField` should be built on `Field`. Cloud sessions need `cdn.playwright.dev` allowed to download the repo's Playwright browser; the personal `product-engineer-test-task` cloud environment allows it and installs the browser in its setup script.

### T-11b The start date must be within the job's range

- Status: done (merged)
- Done when:
  - `min` and `max` are inclusive, and `"today"` is resolved on the server to the server's current date on each request, so the client gets plain dates. The picker greys out dates outside the range, and a date outside it is refused with a message naming the range in the UI locale's date format (test)
  - A `min` or `max` that isn't a `YYYY-MM-DD` date or `"today"` is dropped with a warning; a `min` after `max` drops both, with one warning, since which one is wrong can't be told (test)
  - job-long's `starting_date` can't be set before today (screenshot)
- Touches: src/server (`normalizeQuestion` for date bounds, the server's date in `AppDeps`), src/shared (`min`/`max` on `DateQuestion`, the range in the `date` case), src/components (`min`/`max` on `DateField`), src/app (the range message), claude-notes/decisions.md
- Size: ~170 lines
- After: T-11a
- Branch: claude/task-11-b-1c423c
- Outcome: A date question's `min` and `max` are resolved by `parseJob(raw, today, warn)`: `"today"` becomes the server's date from `AppDeps.today` on each request, a bad bound is dropped with a warning, and a `min` after `max` drops both. `findAnswerError` refuses a date outside the range, inclusive, as `out_of_range`; `DateField` takes `min` and `max`; the message `answerError.date_out_of_range` names the range in the UI locale. Later tickets that call `parseJob` pass a date.

### T-12a The API accepts a file answer

Split from T-12 ("Attach a file, and it's sent in the payload") when the whole came to ~600 lines; the browser half is T-12b and T-12c.

- Status: done (merged)
- Done when:
  - A `file` question is kept by the server and sent to the client as `{ type: 'file' }`, so job-bad's `cover_letter` is no longer dropped (test)
  - A file answer `{ content_type, data, file_name }` is accepted, and stored as that object in the payload; anything else is refused as `wrong_type` (test)
  - The server accepts a body big enough for a 5 MB file encoded as base64, and refuses a bigger body with 413 (test)
- Touches: src/shared (`FileAnswer` in `AnswerValue`, `FileQuestion`, `isFileAnswer`, a `file` case in `findAnswerError` for the shape only), src/server (`normalizeQuestion` for `file`, the request shape check, the body limit)
- Size: ~130 lines
- After: T-11a
- Branch: T-12-file-field
- Outcome: Came to ~175 lines. `FileAnswer` (`{ content_type, data, file_name }`) is in `AnswerValue`, `isFileAnswer` in `src/shared/answerValidation.ts` checks its shape, and `findAnswerError` answers `wrong_type` for anything else. The server keeps `file` questions and the POST is limited to 7 MiB (`payload_too_large`, 413). The stored-submission log writes a file's `data` as its length. The client still has no component for `file`, so it skips the question until T-12b. The unsplit work (607 lines) is on the local branch `T-12-full-wip`, to cut T-12b and T-12c from. A file with an empty `data` counts as no answer (`required` on a required question); T-13 must also refuse an empty `file_name`.

### T-12b Pick a file and see it

Split from T-12b ("Pick a file and see it, or remove it") when its estimate came to ~330 lines; removing the file is T-12d.

- Status: done (merged)
- Outcome: `FileField` (on `Field`) is a button that opens a hidden `<input type="file">` and shows the picked file's name and size in a success-coloured block. `FileQuestion` keeps the picked `File` in state for display only and formats its size (decimal kB/MB). T-12d and T-12c build on both; tests pick a file through the input marked `data-file-picker`.
- Done when:
  - A file question shows a button that opens the file picker; the chosen file's name and size are shown, and choosing another replaces it (test)
  - job-bad's `cover_letter` renders at mobile and desktop widths (screenshot)
- Touches: src/components (a new `FileField` on `Field`), src/app (a `FileQuestion` adapter, its map entry, messages)
- Size: ~200 lines (`FileField` with CSS and tests ~150, adapter, map entry, messages and page test ~50). The adapter keeps the picked `File` only for display; T-12c reads it into the answer
- After: T-12a
- Branch: T-12b-file-field-picker

### T-12d Remove the picked file

- Status: done (merged)
- Outcome: A picked file shows a remove button (an X in the file block) that empties the field and moves focus to the choose button; `Button` now accepts `ref`. The remove button sits inside the `role="status"` region, so the removal itself isn't announced (focus moving to the choose button is the only cue); T-12c needs no change for this.
- Done when:
  - A picked file has a remove button, by mouse or keyboard; removing it empties the field and moves focus to the choose button (test)
- Touches: src/components (`FileField`), src/app (the remove message)
- Size: ~130 lines
- After: T-12b
- Branch: T-12d-remove-picked-file

### T-12c A picked file is read and sent in the payload

- Status: done (merged)
- Outcome: `readFileAnswer` (in `src/app/questions`) reads the picked file into a `FileAnswer` with base64 `data`, and `FileQuestion` answers with it once read; a read that finishes after another pick or a remove is dropped, and a failed read empties the field. Required and optional file questions needed no page change. Written fresh: `T-12-full-wip` wasn't available.
- Done when:
  - The file is read in the browser and sent as `{ content_type, data, file_name }`, with `data` base64, and stored that way in the payload (test)
  - A required file question with no file shows the `required` error; an optional one without a file is left out of the payload (test)
- Touches: src/app (`readFileAnswer`, the `FileQuestion` adapter keeps a `FileAnswer`, page tests)
- Size: ~170 lines
- After: T-12d
- Branch: T-12c-read-file-answer

### T-13 A file of the wrong type or over 5 MB is refused

- Status: todo
- Done when:
  - Picking a file that isn't PDF, DOCX, PNG or JPG, or is over 5 MB, shows an error on the field right away, before it is read or sent, saying which types and size are allowed (test)
  - The server refuses the same files by their content type and decoded size, and a `data` that isn't base64, and an empty `file_name`, with the `AnswerError` codes the client shows (test)
  - The file picker offers only the allowed types (test)
- Touches: src/shared (the file case in `findAnswerError`, new `AnswerError` codes, the allowed types and size), src/components/FileField (an `accept`), src/app (the adapter's check on pick, messages)
- Size: ~170 lines
- After: T-12c
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
- After: T-08a, T-08b, T-09, T-10, T-11a, T-11b, T-12, T-13
- Branch: none yet

## Phase 3: Step flow and drafts

Features: T-15 → T-16, then T-17 → T-18, then T-19 → T-20, then T-21 → T-22.

Phase 2's T-13 → T-14 is still open and is built first, so T-15 sits on top of that stack. T-15 needs nothing from it: it can start on `main` instead if Phase 2's last feature waits.

The steps follow "Phase 3: Questions are split into three steps" in `decisions.md`, and every form state follows "T-07: Form state stays in React, with no form library". `QuestionnairePage.tsx` is already ~235 lines, so T-15 moves the answer state into a hook in `src/app` that the steps, the review screen and the draft share.

Settled while planning, to record in `decisions.md` by the ticket that needs it:

- A step's own answers are checked when the candidate presses Next: its errors show and focus moves to the first, as on submit today. Back never checks. T-15 records it.
- File answers are not kept in the draft: a 5 MB file is ~6.7 MB as base64, over localStorage's usual 5 MB quota, and a CV shouldn't sit in the browser's storage. After a reload a file question is empty and says to pick the file again. T-19 records it.
- `track()` events carry the job id, the step and counts, never an answer value or the screening result (product principle). In development they go to the console, behind a sink that tests replace. T-21 records it.

### T-15 Answer the questions in steps, from your profile to your own words

- Status: todo
- Done when:
  - A job's questions are split into "From your profile", "Quick answers" and "In your own words" as the decision says: a prefilled question goes to the first step whatever its type, each step keeps the config's order, and an empty step is skipped (test, one per rule)
  - Next shows the next step only when this step's answers are valid; otherwise its errors show and focus moves to the first. Back keeps every answer. The last step's button submits, as today (test)
  - Each step shows its name and "Step 2 of 3", counting only the steps shown (test)
- Touches: src/app (`splitIntoSteps` in `src/app/questions`, a `useQuestionnaireAnswers` hook taken out of `QuestionnairePage`, the step screen, step messages)
- Size: ~280 lines (`splitIntoSteps` with tests ~80, the hook moved out ~40, the step screen ~60, messages ~15, page tests ~85)
- After: T-14 (stack order only)
- Branch: none yet

### T-16 See your progress, and land on the new step

- Status: todo
- Done when:
  - A progress bar above the questions fills by step, with an accessible name and value ("Step 2 of 3") (test)
  - Moving to another step, by Next or Back, scrolls to the top and puts focus on the step's heading, so a screen reader announces it (test)
  - job-long's three steps render at mobile and desktop widths (screenshot)
- Touches: src/components (a new `ProgressBar` on `@radix-ui/react-progress`), src/app (the step screen uses it, heading focus)
- Size: ~170 lines (`ProgressBar` with CSS and tests ~110, the step screen and page tests ~60)
- After: T-15
- Branch: none yet

### T-17 Check every answer on a review screen before sending

- Status: todo
- Done when:
  - After the last step, Next opens a review screen that lists every question with its answer as the candidate would read it: a select's option label, "Yes"/"No", a date in the UI locale, a number with grouping, a file's name, several picks joined, and "No answer" for an empty optional question (test, one per type)
  - The review screen counts as the last place in the progress bar, has Back to the last step, and holds the only submit button (test)
  - job-long's review screen renders at mobile and desktop widths (screenshot)
- Touches: src/app (a `formatAnswerForReview` per type, the review screen, messages), src/components (a `DescriptionList` for question and answer pairs)
- Size: ~290 lines (`formatAnswerForReview` with tests ~90, `DescriptionList` with CSS and tests ~90, the review screen, messages and page tests ~110)
- After: T-16
- Branch: none yet

### T-18 Edit an answer in place on the review screen

- Status: todo
- Done when:
  - Each answer on the review screen has an Edit button that turns that row into the question's field, with its current answer; Done shows the new answer, and Done on an invalid answer shows the error and keeps the field open (test)
  - Closing the field puts focus back on that row's Edit button (test)
  - When the server refuses answers with a 422, the review screen opens each refused question's field with its error, and focus moves to the first (test)
- Touches: src/app (the review screen's edit rows, messages)
- Size: ~220 lines
- After: T-17
- Branch: none yet

### T-19 A reload keeps your answers and your step

- Status: todo
- Done when:
  - Every changed answer, and the step or review screen the candidate is on, is saved to localStorage per job, and a reload opens the same step with the same answers, a cleared prefill staying cleared (test)
  - The draft is removed after a successful submit and when the job turns out to be already completed (test)
  - File answers aren't saved: after a reload the file question is empty and says to pick the file again (test)
- Touches: src/app (a `useQuestionnaireDraft` hook beside `useQuestionnaireAnswers`, its storage key, the hint message), claude-notes/decisions.md
- Size: ~230 lines
- After: T-18
- Branch: none yet

### T-20 A draft that no longer fits the job is repaired, not trusted

- Status: todo
- Done when:
  - On restore, an answer to a question the job no longer has, or of the wrong shape for its question, is dropped, and the rest are kept; a saved step past the job's steps opens the first step (test, one per case)
  - A draft that isn't valid JSON, or a localStorage that throws on read or write, leaves the form working without a draft, with no console error (test)
- Touches: src/app (the draft's restore check, using `findAnswerError` from src/shared for shapes)
- Size: ~170 lines (the check ~50, tests ~120)
- After: T-19
- Branch: none yet

### T-21 Steps, the review and the submit are tracked, without answers

- Status: todo
- Done when:
  - A typed `track(event)` reports `step_viewed`, `step_completed`, `review_viewed`, `answer_edited` (from review) and `prequalification_submitted`, each with the job id and step, and none with an answer value or the screening result (test, one per event)
  - In development events are written to the console's debug log; tests swap the sink and assert the events (test)
- Touches: src/app (`track.ts` with its event types and sink, calls from the steps, review and submit), claude-notes/decisions.md
- Size: ~180 lines
- After: T-20
- Branch: none yet

### T-22 Answer job-long by keyboard alone, reloading halfway, and send the same payload

- Status: todo
- Done when:
  - An e2e run answers job-long by keyboard only (Tab, arrows, Space, Enter) through every step and the review screen, edits one answer there and submits (e2e)
  - A second run reloads in the middle of the second step, finishes, and stores the same payload as the first; the draft is gone afterwards (e2e)
  - Every step and the review screen have a visible focus ring on each control and no axe violations (e2e)
- Touches: e2e (a job-long step-flow spec, clearing its submission first), src/app or src/components only where the runs find a keyboard gap
- Size: ~200 lines
- After: T-21, T-14
- Branch: none yet
