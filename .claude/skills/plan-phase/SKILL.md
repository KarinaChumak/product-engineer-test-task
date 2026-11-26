---
name: plan-phase
description: Break the next phase in the plan into tickets, each a behavior the user can see, delivered end to end in PRs under 500 lines. Use when a phase is nearly done, when kickoff plans Phase 1, or when the user runs /plan-phase.
---

# Plan the next phase

Break down one phase only: the current one if it has no tickets yet, otherwise the next. Later phases stay one-line goals, because what you learn now will change them.

## 1. Read

- `claude-notes/plan.md` (start from [plan-template.md](plan-template.md) if it doesn't exist), `claude-notes/product.md` and `claude-notes/decisions.md`.
- What the finished tickets of the previous phase changed: their outcomes in `plan.md` and the merged code.
- If what you learned changes a later phase's goal, propose the new goal to the user before planning.

## 2. Slice by behavior

Each ticket is one behavior a user can see, delivered end to end in the same PR: UI, types, API, data, copy and translation keys, and tests together.

- Never split by layer. Not "all the types", then "all the copy", then "all the tests".
- Name a ticket after what the user can do: "Sign in and see an empty dashboard", not "Auth service".
- The first ticket of a project is the walking skeleton: the thinnest path through every layer. Shared pieces (a contract, a layout, a registry) appear inside that first slice, not as tickets of their own.

## 3. Size

- Estimate changed lines per ticket, tests included. Lockfiles, generated files, snapshots and data files don't count.
- Over 500 lines: split the ticket into PRs, each still a complete slice of a smaller behavior. Example: "a select question renders, takes an answer and adds it to the payload, with keys and tests", then "screening rules for select answers, with the rejection path and tests". List the PRs in the ticket.
- Well under 100 lines: merge it into a neighbouring ticket unless it stands alone.

## 4. Order and parallel lanes

- Fill in `Touches` with the folders or modules each ticket changes, and `After` with the tickets it needs merged first.
- Tickets that touch different areas and don't depend on each other can run in parallel, each in its own session and worktree. Mark them as lanes at the top of the phase, for example: `Lanes: T-04 ‖ T-05, then T-06`.
- Tickets that touch the same area run one after another, even if they look independent.

## 5. Write the tickets

In `claude-notes/plan.md`, add a `## Phase N: <Name>` section after the previous phase's, with the lanes and then the tickets, in the format of [plan-template.md](plan-template.md):

```markdown
### T-04 Filter the dashboard by date range

- Status: todo
- Done when:
  - Choosing "Last 7 days" updates every chart (test)
  - The range survives a page reload (test)
  - The picker works by keyboard (e2e)
- Touches: src/dashboard/filters, src/api/stats
- Size: ~350 lines
- PRs: one
- After: T-02
- Branch: none yet
```

- Ticket IDs keep counting across phases: T-01, T-02… never restart.
- Every "done when" can be proved by a test or a screenshot.
- In the `## Phases` list, mark this phase `(current)` and remove the marker from the previous one. Update its goal or exit there if planning changed them.

## 6. Report

Show the phase's tickets as a short table (ID, behavior, size, after) and the lanes. Say which tickets can start now.
