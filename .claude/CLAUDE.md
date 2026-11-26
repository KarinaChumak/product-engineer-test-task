# Project

React 19 + TypeScript + Vite single-page app, compiled with React Compiler. Tests: Vitest + Testing Library (unit), Playwright (e2e).
Non-goals: SSR, a global state library, CSS-in-JS. Ask before adding any of them.

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
- For UI changes, `/design-check` passes and `/verify-ui` shows the change rendering at mobile and desktop widths with no console errors.
- When you report done, include the command you ran and its output, or the screenshot path.
- Bug fixes start with a failing test that reproduces the bug.

# Planning

- `claude-notes/product.md` says what the product is for; `claude-notes/plan.md` holds the phases and the current phase's tickets. `/kickoff` creates both; `/plan-phase` breaks down the next phase.
- A ticket is one behavior the user can see, with its UI, types, API, copy and tests in the same PR. PRs stay under 500 changed lines; a bigger ticket is split into PRs that are each a complete smaller behavior.
- Each ticket runs in its own branch and worktree under `.claude/worktrees/`, set up by the `ticket` skill; the main checkout stays on `main`. When a ticket is done, the `finish` skill has a separate reviewer agent review it, fixes what it finds, and opens the PR. `address-review` fixes the comments reviewers leave on the PR.

# Conventions

- Decisions that affect more than one ticket are in `claude-notes/decisions.md`. Read it before proposing an approach. To change a decision, add a new entry at the end that says which one it supersedes; don't edit old entries.
- Open pull requests, never merge them. A human merges.
- Components live in `src/components/<Name>/` with `<Name>.tsx`, `<Name>.test.tsx` and `index.ts`. Use `/scaffold-component` to create one.
- UI follows `.claude/DESIGN.md`.
- Import from `@/…`, never with `../`.
- Query elements in tests by role or label (`getByRole`), not by test id or class name.
- Don't add `useMemo`, `useCallback` or `memo` for performance: React Compiler memoizes. Use them only when a value's identity matters to an effect.

# Gotchas

- Paths listed in `.claude/protected-paths` are blocked from edits by a hook. Ask a human to change them.
- Before you stop, a hook runs `.claude/scripts/quick-check`. If it blocks you, fix the cause rather than working around it.
- Change dependencies with `pnpm add` / `pnpm remove`; `pnpm-lock.yaml` is protected from direct edits.
- The lint, TypeScript, Vite and Playwright configs are protected, so a check can't be turned off to make it pass. Ask a human to change them.

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
