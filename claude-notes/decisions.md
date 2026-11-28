# Decisions

Decisions that affect more than one ticket. Add new entries at the end and never edit old ones: to change a decision, add an entry that says which one it supersedes. Git merges this file with the `union` driver (see `.gitattributes`), so entries added on parallel branches never conflict.

<!--
Entry format:

## <ticket ID> <short title>

<What was decided.> Why: <the reason>. Rejected: <the alternatives>.
-->

## Kickoff: The server owns the config and the screening

`GET /api/jobs/:id` returns a normalized, client-safe job: questions and their input options, with every screening rule removed. `POST /api/jobs/:id/applications` takes only the answers, validates them again, computes `screening` and builds the contract payload. The candidate never sees pass/fail, a threshold or the payload. Why: if the browser built the payload, anyone could send `passed: true`, and the rules would be readable in the bundle. Rejected: client-side screening, which the brief allows but production-ready rules out.

## Kickoff: Deterministic normalization on GET

The server repairs the config instead of dropping questions. It applies the README rules (the first of duplicate IDs wins, unknown types are dropped, rules on the wrong type are ignored) plus defensive fixes (`max_choices` capped at the option count, `"today"` resolved, min > max, empty option lists, text over 255 characters). Each fix is logged as a warning. Why: the payload still matches the contract, and the logs show recruiters what was wrong. Rejected: refusing bad configs; an LLM-based cleanup (not deterministic).

## Kickoff: Profile prefill is resolved on the server

The GET response carries each question's prefilled value, taken from `profile.json` through `profile_field`. The client shows it as "from your profile" for the candidate to confirm. Why: one place maps profile fields to answer values, and the client doesn't need the whole profile. Rejected: the client fetching the profile and mapping fields itself.

## Kickoff: API runs as a separate Hono process behind a Vite proxy

The Hono app lives in `src/server/`, so the existing tsconfig, lint and Vitest setup cover it. Types shared with the client live in `src/shared/`. In dev it runs as its own Node process, and Vite proxies `/api` to it. `.claude/scripts/dev` starts both, with the API port derived from the ticket's port. A human adds the `server.proxy` entry to the protected `vite.config.ts`. Why: the dev setup matches a production-style split, and the client only ever calls same-origin `/api`. Rejected: mounting Hono as Vite middleware (dev and prod would differ more); CORS with a separate origin.

## Kickoff: Submissions stored in a JSON file

Submissions go in `data/submissions.json` (gitignored), keyed by `candidate_id + job_id`. Writes go through one module that serializes them (an in-process queue, write to a temp file, then rename), so the duplicate check and the write can't interleave. Why: easy to inspect, no dependency, enough for one candidate. Rejected: `node:sqlite` (an atomic UNIQUE constraint, but harder to inspect); in-memory storage (lost on restart).

## Kickoff: Drafts in localStorage only

Answers are kept as a draft in localStorage per job, and the draft is cleared after a successful submit. Nothing reaches the server before an explicit submit. Why: no data reaches the recruiter until the candidate sends it, and a reload doesn't lose work. Rejected: server-side drafts.

## Kickoff: Styling with CSS Modules and Radix primitives

Components use CSS Modules (`<Name>.module.css`) with tokens from `src/index.css`, and Radix primitives for the select, checkbox and dialog behaviour. Icons come from Lucide, and Geist stands in for Aeonik Pro. Why: same approach as Instaffo, accessible primitives, no CSS-in-JS. Rejected: plain global CSS (class collisions); a full component library (it would fight Instaffo's look).

## Kickoff: UI copy with react-intl

UI strings live in `de` and `en` message files, and react-intl formats them. The locale comes from `job.language`. Number and date formats follow that locale. Recruiter questions and option labels are shown as written, never translated. Why: ICU plurals and number and date formatting in one place. Rejected: a custom typed dictionary; i18next.

## Kickoff: The candidate is fixed to profile.json

There's no sign-in. The server treats `profile.json` (`talent-4711`) as the current candidate. Why: auth is out of scope for the task. Rejected: a candidate switcher.

## Kickoff: Styling follows Instaffo's current stack

Supersedes "Styling with CSS Modules and Radix primitives" only to record where it comes from. The decision itself is unchanged. CSS Modules and Radix are what Instaffo uses today: its class names (`index-module__variant_body-m__…`) come from CSS Modules, and the page carries Radix's `data-radix-collection-item` attributes. Lucide and Geist are free stand-ins. Instaffo uses Font Awesome 6 Pro (Duotone, Thin, Sharp) and Aeonik Pro, which are paid and can't be shipped in this repo. Why: the candidate flow should look and behave like Instaffo's. Rejected: the free tier of Font Awesome (it lacks the Pro styles, so it wouldn't match either).

## T-01: The client fetches a job's questionnaire

The client asks for the questions a job asks, not the job itself, so the names say so: `GET /api/jobs/:id/questionnaire` returns a `JobQuestionnaire` (`src/shared/questionnaire.ts`), built on the server by `toJobQuestionnaire`. The client reads it through `useJobQuestionnaire`, and `QuestionnairePage` renders it. The questionnaire still carries the job's title, company and language to show the questions in. Later endpoints about a job (applications, completion status) stay under `/api/jobs/:id/…`. Why: "job" names the recruiter's whole config, which the client never sees. Rejected: `GET /api/jobs/:id` with a `ClientJob` type.

## T-01: Screens live in src/app, reusable components in src/components

Screens and their wiring (data hooks, the message files) live in `src/app`; anything a screen renders comes from `src/components`. Why: screens stay thin and components stay reusable across tickets. Rejected: per-screen component folders.

## T-01: Data fetching goes through TanStack Query

Every request from the client is a `useQuery` (or `useMutation`) whose function lives in `src/app/api.ts`; components and hooks never call `fetch` in an effect. A hook such as `useJobQuestionnaire` returns the `useQuery` result unchanged, and the screen branches on `isPending`, `isError`, `error` and `data`. `createQueryClient()` in the same file sets the defaults: no retry on a 404 (`NotFoundError`), up to two retries otherwise, and failed requests are logged. Tests render through `render` from `@/test/render`, which uses a client without retries or logging. Why: loading, error, retry, abort and caching come from one library instead of each hook hand-rolling them. Rejected: `fetch` in `useEffect` (every hook repeats the abort and error handling); SWR (fewer mutation tools for T-04's submit); mapping the query to a custom `{ status }` union (a second state type to keep in sync).

## T-01: Screens define no CSS

Files in `src/app` have no stylesheets and set no `className` or `style`. Layout and look come from small components in `src/components` (`Page`, `PageHeader`, `Notice`, `Skeleton`, …), each with its own CSS Module. `src/test/conventions.test.ts` fails on a violation. Why: every style is reusable and lives in one place, so screens can't drift from the design. Rejected: a CSS Module per screen.

## T-01: Tests mock the network with MSW and fail on console output

Client tests declare responses with `server.use(http.get(…))` from `@/test/server`; a request without a handler fails the test. `vitest-fail-on-console` fails any test that logs a warning or error, so tests never spy on the console; the test query client attaches no logger. The conventions test bans `spyOn(console` and `stubGlobal('fetch'`. Why: tests exercise the real `fetch` path, and unexpected logs surface instead of being muted. Rejected: stubbing `fetch` with `vi.fn` (couples tests to call shapes); console spies (they hide real warnings).

## T-01: Routes come from React Router

`src/app/routes.tsx` declares the routes: `/` redirects to `/jobs/job-short`, `/jobs/:jobId` renders `QuestionnairePage`, which reads the ID with `useParams`, and any other path renders `NotFoundPage`. `main.tsx` mounts them with `createBrowserRouter`; tests render them with `renderAt(path)` from `@/test/render`, which uses a memory router. Why: the job ID is a route param, and later screens (review, already completed) become routes instead of more path parsing. Rejected: parsing `window.location.pathname` by hand; TanStack Router (its file-based setup needs a Vite plugin in the protected config).

## T-01: Question types render through a type → component map

`src/app/questionComponents.ts` maps each question `type` to an adapter in `src/app/questions/` that takes `QuestionProps` (question, value, onChange) and renders a component from `src/components/`. Screens ask `getQuestionComponent(question)`, which returns undefined for a type without an entry, so that question isn't rendered. Each later question type adds one entry. Why: the page stays the same as types are added, and two tickets adding types only touch one line each. Rejected: a switch in the page.

## T-01: The UI falls back to the browser language

Supersedes "UI copy with react-intl" only for where the locale comes from. The locale is the job's `language` when it is `de` or `en`. When the job has none, or one the app doesn't support, `JobQuestionnaire.language` is left unset and the UI uses the browser's language. An unsupported value is logged as a warning. Why: a job without a language says nothing about the candidate, and the browser does. Rejected: defaulting to `en`, which hides typos like `"DE"` in a job config.

## Job switcher: The client lists jobs through GET /api/jobs

`GET /api/jobs` returns every job as a `JobSummary` (id, title, company), built by `toJobSummary`; a config without a string `id` is left out. The API reads jobs through one `JobStore` (`find`, `list`), and `createApp(overrides)` defaults every dependency to the real one (`jobs/`, `profile.json`, the console), so `index.ts` calls `createApp()` and tests pass only what they fake. Every page shows a `JobSwitcher` above `<main>`, in a `TopBar` navigation landmark, that opens the job picked. It's a shortcut, so it isn't shown while the list loads or when it fails. `QuestionnaireView` is keyed by job ID, so switching between cached jobs starts from fresh answers. Why: switching between job-short, job-long and job-bad by editing the URL was slow during development and demos. Rejected: hard-coded links (they'd drift from `jobs/`); returning the whole questionnaires (the list needs none of the questions).

## Job switcher: Screens sit in a card on a grey page

The page background is `--color-surface`, the top bar is lilac (`--color-accent-soft`), and each screen's content (loading, errors, the questionnaire) sits in a `Card`: white (dark in dark mode), borderless, `--radius-3`, `--shadow-card`. Select outlines use `--color-field-border`, the lightest grey that still keeps 3:1 against the card. Why: the questionnaire stands out from the job switcher above it, closer to Instaffo's look. Rejected: `--color-line` for select outlines (1.5:1 fails WCAG 1.4.11).

## Architecture review: The server parses a job config once, into a Job

`parseJob(raw, warn)` in `src/server/normalize.ts` repairs a config once, into a server-only `Job`. Each `JobQuestion` keeps the client question (`client`) and, beside it, what only the server needs (today its `profileField`), so server-only data is never inside what's sent. `toJobQuestionnaire(job, profile)` builds the candidate's questionnaire from the `Job`. T-04 adds the screening rules to `JobQuestion` beside `client`, and its answer checks and screening read the same `Job`. Why: the GET and POST routes then agree on every repair, and there's only one reader of the messy config. Rejected: parsing straight into the client shape and reading `must_be_*` from the raw config again in the POST route (two readers that can drift).

## T-02: A cleared answer is undefined, and it doesn't fall back to the prefill

A question adapter calls `onChange(undefined)` when the candidate empties a field. The page stores that as a changed answer, so a cleared prefilled question stays empty instead of showing the profile value again. Only questions the candidate never touched fall back to `prefill`. Why: otherwise deleting a prefilled salary snaps back to 95,000, and the candidate can't leave an optional answer empty. Rejected: an empty string or `0` as "cleared" (both are real answers for some types).

## Phase 3: Questions are split into three steps

The step flow (Phase 3) splits a job's questions into three steps, in this order:

1. **From your profile:** every question with a `prefill`, whatever its type, for the candidate to confirm.
2. **Quick answers:** the remaining select, boolean, numeric and date questions.
3. **In your own words:** the remaining text questions (single-line and multiline) and file uploads.

A question appears in only one step, and within each step questions keep their order from the config. A step with no questions is skipped, and progress counts only the steps that are shown. The review screen comes after step 3. Why: confirming what the profile already knows is the fastest start, and the questions that take the most effort come last, once the candidate has made progress. Rejected: one step per question (too many screens for job-short); grouping by the config's order (it mixes easy and hard questions).

## NumberField: react-number-format groups digits while typing

Adds to "Styling with CSS Modules and Radix primitives": Radix has no number field, so `NumberField` renders `NumberFormatBase` with the props from `useNumericFormat` in `react-number-format`. That library groups digits as the candidate types and handles the caret and deleting next to a separator. The separators come from `Intl.NumberFormat` for the locale. The field takes whole numbers only, so it passes its own `removeFormatting` that keeps digits only: a pasted `95.000` or `95,000` keeps all its digits (95000) in either locale, as before, instead of being cut at the decimal separator. Leading zeros stay on screen until the field loses focus. Why: the hand-written caret and separator handling was most of the component and the hardest part to get right. Rejected: grouping only on blur (the candidate wouldn't see `95.000` while typing); React Aria's `NumberField` (a second widget library beside Radix).

## T-04: The answers are a prequalification, not an application

The candidate's answers prequalify them for the job: they reach the employer only if they pass the job's screening. So nothing in the code or the UI calls them an application, and the candidate is never told that something was "sent" or "applied". The end screen says the answers were recorded and will go to the employer if the candidate fits what the job asks for, the same whether they passed or not. Code names follow: `POST /api/jobs/:id/prequalification`, `PrequalificationRequest`, `buildPrequalificationPayload`. Why: telling a screened-out candidate their application was sent would be false. Rejected: "application" wording (it promises the employer sees it); "answers" as the name (it says what is sent, not what it's for).

## T-04: Prequalification answers are posted by question id, and the reply says nothing about screening

The client posts `PrequalificationRequest` (`src/shared/prequalification.ts`), `{ answers: { [questionId]: value } }`, to `POST /api/jobs/:id/prequalification`. The server builds the README payload from it, in the job's question order, leaving out answers that are missing, blank or an empty list. Every accepted request gets the same empty `201`, so once screening is added (T-04's PR 2) the reply can't reveal whether the candidate passed. The stored record is `{ candidate_id, payload }` under the key `<candidate_id>:<job_id>` in `data/submissions.json`. Why: the client never needs the payload's shape or the result, and one key per candidate and job is what T-05's duplicate check reads. Rejected: posting the contract's `answers` array (the client would build the `value`/`values` split the server owns); returning the stored payload (it will hold `screening`).

## T-04: Invalid answers get a 422 with an error code per question, and a failed screening rule is never one

`findInvalidAnswers` (`src/server/validation.ts`) checks the answers against the job's normalized questions, the ones the candidate saw, before anything is stored: a select value must be an option (multi-choice: no repeats, at most `max_choices`), a number an integer within `min`/`max`, text at most `maxTextAnswerLength` (5,000 characters, counted as the candidate sees them), and a required question can't be missing or blank. The reply is `422 { error: 'invalid_answers', fields: { [questionId]: AnswerError } }`, with every refused answer at once. `AnswerError` (`src/shared/prequalification.ts`) is a fixed set of codes the client turns into its own copy. Screening runs only on valid answers, and a failed rule still gets the empty `201`. Prefill uses the same check, so the form never prefills a value the server would refuse; a profile value is a single string, so a multi-choice question is never prefilled. Why: the codes say what's wrong with the input without the server's wording or any threshold, and T-06 shows them on their fields. Rejected: server-written messages (they'd skip the job's language); stopping at the first error (the candidate would fix one field per round trip); refusing an answer that fails a rule (it would reveal the threshold).

## T-04: The candidate learns whether they passed, never why

Supersedes, in "T-04: The answers are a prequalification, not an application", that the end screen is the same whether the candidate passed or not, and, in "T-04: Prequalification answers are posted by question id…", that every accepted request gets the same empty `201`. The `201` now carries `PrequalificationResult` (`src/shared/prequalification.ts`), `{ passed: boolean }`, and the end screen says either that the answers were sent to the employer or that they won't be, because the candidate doesn't meet the job's requirements. It never names the failed question or a threshold, and the payload's `screening.failed` stays on the server. The stored submission is logged whole as a stand-in for the employer integration; real logging needs a sink that redacts the candidate's answers and `screening.failed`. A yes/no reply lets a candidate probe a threshold by resubmitting, which T-05's one submission per candidate and job closes. The answers are still a prequalification, never called an application. Why: a candidate left not knowing whether the employer has their answers can't decide what to do next. Rejected: naming the failed questions (it points at where a threshold is, and invites answering around it); the same screen for everyone (the earlier decision).

## T-04: Of duplicate question ids, the first kept question counts

`parseJob` drops a question whose id an earlier question already has, with a warning, following the README. "Earlier" counts only questions that survive normalization, so a first question dropped for an unsupported type doesn't hide a valid later one. The questionnaire, the check, screening and the payload all read the same deduplicated `Job`. Why: two questions with one id would show twice and collide in the answers map. Rejected: the first in the raw config, even when it is dropped (the candidate would lose a question they could answer).

## T-06: The client runs the server's answer check before sending, from src/shared

Supersedes, in "T-04: Invalid answers get a 422…", where the check lives. `findInvalidAnswers(questions, request)`, `findAnswerError` and `isEmptyAnswer` move from `src/server/validation.ts` to `src/shared/answerValidation.ts`, and take the `ClientQuestion`s the candidate saw rather than the server's `Job`. The client runs it on submit and sends nothing while it finds errors; the server runs it again and answers 422 with the same `AnswerError` codes. Both show the same way: each refused field gets `error`, which marks it `aria-invalid`, links a `FieldError` through `aria-describedby`, and `Form`'s `invalidFocusRequest` moves focus to the first. The client maps each code to its own copy (`answerError.<code>`), and names only the field's own limits (`min`/`max`, choices, length), never a screening rule. `src/shared` may hold logic only when it needs nothing but shared types, so no screening rule reaches it; `src/test/clientBundle.test.ts` guards that. Each new question type adds its case to `findAnswerError` and its codes' messages. Why: client and server can't disagree on what's invalid, and most refusals show without a round trip. Rejected: a separate client-side check (two lists of rules to keep in step); only showing the server's 422 (a round trip for every empty field).

## T-07: Form state stays in React, with no form library

The questionnaire keeps its answers, touched fields and errors in its own React state, and works out which errors to show on every render: `findInvalidAnswers` runs on the current answers, and a field shows its error once the candidate has left it or has submitted. Only the server's 422 errors are stored, until that answer changes. Every later form (Phase 3's steps and review screen) does the same. Why: the three fields are controlled custom widgets (Radix Select, react-number-format), so a library would need a `Controller` and a ref through every field, and it treats an `undefined` value as "use the default", against "T-02: A cleared answer is undefined, and it doesn't fall back to the prefill". The rule itself is a set of ids and one flag. Rejected: React Hook Form with `mode: 'onTouched'` (the closest fit, but the wiring above outweighs the logic it saves); TanStack Form (the same wiring, more verbose).

## T-05: A job is answered once, and the questionnaire says when it has been

A candidate's prequalification for a job is stored once. `SubmissionStore.saveIfNew` checks for the `<candidate_id>:<job_id>` key and writes in one queued step, so of two requests sent at once exactly one is stored; the other, and any later one, gets `409 { error: 'already_completed' }` (`AlreadyCompletedResponse`) and the stored payload stays as it was. The POST still validates first, so an invalid second submission gets the 422. `GET /api/jobs/:id/questionnaire` carries `isCompleted` in `JobQuestionnaire`, and the client shows an "already completed" screen in place of the form, for a reopened job and for a 409. That screen never says whether the candidate passed. After a successful submit the client invalidates the questionnaire, so reopening the job shows it as completed, while the result screen stays until the candidate leaves. The e2e specs share the dev server's `data/submissions.json`, so `.claude/scripts/e2e` runs them on one worker and specs that answer job-short clear its submission first (`e2e/submissions.ts`). Why: a second answer would let a candidate probe a screening threshold through the passed/not-passed reply. One request carries everything the page needs. Rejected: a separate `GET /api/jobs/:id` or status route (a second request, and the page would wait for both); a check before the write in the route (two requests at once could both pass it); a per-worker data file (the dev server is shared and reused, so it reads one file).

## T-08b: A missing answer fails a question's screening rule

Settles the open question in `product.md`. `screenAnswers` fails a question with a rule when it has no answer, whatever the rule: the numeric rules already did, and `must_be_true` (kept as `ScreeningRules.mustBeTrue` on a boolean question only) does too, so an optional yes/no question with the rule fails when it is left empty. Only a JSON `true` passes `must_be_true`; a `must_be_true` that isn't `true`, or on another type, is ignored with a warning. Every rule question in the three jobs is required, so a candidate meets this only through a config like that. Why: the README says so, and an empty answer can't show the candidate meets the requirement. Rejected: passing a missing answer on an optional question (the recruiter's rule would never screen anyone who skips it).

## T-11a: Dates are picked in the browser's own date input, in the browser's format

Supersedes, in "UI copy with react-intl", that date formats follow the UI locale, for the date field only. `DateField` renders `<input type="date">`, so the browser draws the field and its calendar, and shows the date in the browser's language format (`mm/dd/yyyy` in an en-US browser, even on a German job). The value is always `YYYY-MM-DD`, which is what's sent. Messages about dates, such as T-11b's range error, are still formatted by react-intl in the UI locale. Why: the native input brings the platform's own picker and keyboard entry, a phone's date wheel included, with nothing to build or ship. Rejected: a third-party picker such as react-day-picker or React Aria's DatePicker (a calendar widget and a second widget library beside Radix, which has no date picker); setting `lang` on the input (Chrome ignores it).

## T-11a: Fields share their label and error wiring through Field

`Field` (`src/components/Field`) renders a control's label, required `*`, annotation and `FieldError`, and gives the control its `id`, `required`, `aria-describedby` and `aria-invalid` through a render function. New single-control fields (`DateField` now, T-12's `FileField`) are built on it. `TextField`, `NumberField` and `Select` still repeat that wiring and move onto `Field` in Phase 4's accessibility pass; group fields (`RadioGroup`, `CheckboxGroup`) keep their `fieldset` and `legend`. Why: the wiring is the same in each field and is where accessibility bugs hide. Rejected: a hook returning the ids (each field would still repeat the markup); moving every field onto it now (it would double this ticket's size).
