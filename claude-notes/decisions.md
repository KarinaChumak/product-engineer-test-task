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
