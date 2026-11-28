# Project

React 19 + TypeScript + Vite single-page app, compiled with React Compiler. Tests: Vitest + Testing Library + MSW (unit), Playwright (e2e).

Decided by the stack, so don't ask about these:

- Routing: React Router. Routes are in `src/app/routes.tsx`.
- Server data: TanStack Query. No other fetching or caching layer.
- API mocks in tests: MSW. Each test declares its answers with `server.use` from `src/test/server.ts`.
- Styling: CSS Modules per component in `src/components/`, using the tokens in `src/index.css`.

The API server (Hono), translations (react-intl) and widget primitives (Radix) are settled in the decision log.

Non-goals: SSR, a global state library, CSS-in-JS. Ask before adding any of them.

Where code goes:

- `src/components/<Name>/`: generic, styled building blocks (Button, Select, Notice). They own all the CSS and know nothing about the product.
- `src/app/`: screens, routes, request functions (`api.ts`), query hooks and copy. Screens compose `src/components/` and have no CSS.
- `src/server/`: the Hono API. `src/shared/`: types the client and the server share.

# Commands

These scripts are the entry points in this repo. Use them instead of calling the underlying tools.

- Install dependencies: .claude/scripts/setup
- Everything CI checks: .claude/scripts/check
- Tests, all or one target: .claude/scripts/test [target]
- Format files: .claude/scripts/fix <files>
- Dev server: .claude/scripts/dev (http://localhost:5173, or `PORT`)
- E2E: .claude/scripts/e2e (first run on a machine: pnpm exec playwright install chromium)

# Verification

- A change is done when `.claude/scripts/check` passes.
- For UI changes, check the screen once in the browser at mobile and desktop widths with no console errors. The full `/design-check` and `/verify-ui` run once per feature, in `/finish`, not per slice.
- When you report done, include the command you ran and its output, or the screenshot path.
- Bug fixes start with a failing test that reproduces the bug.

# Planning

- `claude-notes/product.md` says what the product is for; `claude-notes/plan.md` holds the phases and the current phase's tickets. `/kickoff` creates both; `/plan-phase` breaks down the next phase.
- This is a time-boxed test task, so the process stays light (see "The rest of the task is built in features and reviewed as stacked PRs" in the decision log).
- A ticket is one behavior the user can see, with its UI, types, API, copy and tests, under 500 changed lines. It is one slice: one branch and one PR.
- A feature is a few tickets built together in one batch (all of T-12, or T-13 and T-14). Build it slice by slice, each ticket's branch on top of the one before, in this one worktree. Don't stop between slices.
- The expensive checks run once per feature, not per slice: `/finish` (the reviewer agent, the finisher, `/design-check` and `/verify-ui`) runs when the feature's last slice is built.
- The PRs are stacked: each slice's PR is based on the branch below it, and the bottom one on `main`. Nothing waits on a merge: start the next feature on top of the stack while the user reviews.
- A fix asked for in a PR is a new commit on that PR's branch, never a rewrite of it. Then carry it up the stack from the top branch with `git rebase --update-refs <fixed-branch>` and push the branches above with `--force-with-lease`. The user merges from the bottom up, with merge commits, not squash.
- Update `plan.md` only for a ticket's status and a one-line outcome. Add a decision log entry only for a choice another reader would ask about.

# Conventions

- Decisions that affect more than one ticket are in `claude-notes/decisions.md`. Read it before proposing an approach. To change a decision, add a new entry at the end that says which one it supersedes; don't edit old entries.
- A name says exactly what the thing is or does. A function is a specific verb plus the specific thing it acts on: `getJobQuestionnaire`, `setDraftAnswer`, `clearDraft`, not `job()`, `getData()` or `handleChange()`. Name the thing itself, not its container or a vaguer word (`useJobQuestionnaire` when it loads a job's questions, not `useJob`), and use the same word for it everywhere. Booleans read as a yes/no question (`isOpen`, `hasPrefill`).
- Edit files with the Edit and Write tools, never with a script (Python, Perl, Node or `sed -i`): the user reviews each edit, and a script can do anything.
- Open pull requests, never merge them. A human merges.
- Components live in `src/components/<Name>/` with `<Name>.tsx`, `<Name>.module.css`, `<Name>.test.tsx` and `index.ts`. Use `/scaffold-component` to create one.
- Components in `src/components/` are generic: their names and props use UI words (`hint`, `tone`, `label`), never product words. Name them as design systems do: Text, not Paragraph.
- Read URL parameters with React Router's `useParams` and `useSearchParams`, never from `window.location`.
- UI follows `.claude/DESIGN.md`.
- Import from `@/…`, never with `../`.
- Query elements in tests by role or label (`getByRole`), not by test id or class name.
- Don't add `useMemo`, `useCallback` or `memo` for performance: React Compiler memoizes. Use them only when a value's identity matters to an effect.
- Fetch data with TanStack Query: request functions live in `src/app/api.ts`, and components and hooks call them through `useQuery`/`useMutation`, never with `fetch` in a `useEffect`. A query hook returns the `useQuery` result as it is; don't map it to a status type of your own. Tests render through `render` or `renderAt` from `@/test/render`.
- Screens in `src/app` define no CSS (no stylesheets, `className` or `style`) and render only components, never HTML elements: every style lives in a small reusable component in `src/components`. ESLint and a conventions test enforce it.
- Mock the network in tests with MSW (`server.use(http.get(…))` from `@/test/server`), never by stubbing `fetch`. Never spy on or silence the console: a logged warning or error fails the test, so fix what logs it.

# Gotchas

- Paths listed in `.claude/protected-paths` are blocked from edits by a hook. Ask a human to change them.
- Before you stop, a hook runs `.claude/scripts/quick-check`. If it blocks you, fix the cause rather than working around it.
- Change dependencies with `pnpm add` / `pnpm remove`; `pnpm-lock.yaml` is protected from direct edits.
- The lint, TypeScript, Vite and Playwright configs are protected, so a check can't be turned off to make it pass. Ask a human to change them.
- When pnpm stops with "Ignored build scripts", decide each package in `allowBuilds` in `pnpm-workspace.yaml`: `false` unless the package needs its script to work, and say which you chose in the PR. Don't hide pnpm's output: `check` runs the same install as CI and fails on it.

# Feedback ending in `#`

A message or review comment you're addressing that ends with `#` is a rule to keep, not just a one-off fix. Fix the code it's about, then write the rule as one sentence about a class of code and put it in the first place that fits:

| If the comment is…                                      | Put it in                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Something a machine can check                           | A linter rule, a type, or a test                                                                             |
| A rule with zero exceptions about what Claude may touch | A hook in `.claude/hooks/`, a line in `.claude/protected-paths`, or a `deny` rule in `.claude/settings.json` |
| Something reviewers should flag                         | `.claude/REVIEW.md`                                                                                          |
| A convention for some files only                        | `.claude/rules/*.md` with `paths:`                                                                           |
| A convention for all code                               | This file                                                                                                    |
| A procedure with several steps                          | A skill in `.claude/skills/`                                                                                 |

If a rule already covers it, fix why it didn't work instead of adding a duplicate. Show the rule working: the linter failing on a sample violation, or the hook blocking a sample input. Then run `.claude/scripts/check`, and say where the rule went.
