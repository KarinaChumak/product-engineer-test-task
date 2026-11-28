---
name: plan-phase
description: Break the next phase in the plan into small tickets, each a behavior the user can see, delivered end to end in one PR. Use when a phase is nearly done, when kickoff plans Phase 1, or when the user runs /plan-phase.
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
- The first ticket of a project is the walking skeleton: the thinnest path through every layer, such as one page that loads one thing from the API and shows it. Shared pieces (a contract, a layout, a registry) appear inside that first slice, not as tickets of their own.

## 3. Size

Each ticket is one PR. Estimates run low, often by half, and review adds more, so plan well under the 500-line limit.

- Estimate changed lines per ticket, file by file, tests included. Lockfiles, generated files, snapshots and data files don't count.
- Business rules (validation, pricing, permissions, eligibility) need a test per boundary and edge case, so their tests often run 2–3 times their code. Estimate those tests first, from the list of cases, and size the ticket around them.
- More than 3 "done when" items, or rules and the UI that uses them in one ticket, usually means several behaviors. Split by behavior, not by layer: "book a slot and see the confirmation", then "a slot that's already taken is refused with a message", then "a booking over the customer's weekly limit waits for approval".
- The first 2–3 tickets of a project: about 150 lines each. They set the patterns (data fetching, page structure, components, tests) that every later ticket copies, so they get the most review rounds. Keep them small enough that reworking a pattern is cheap.
- Every other ticket: at most about 300 lines.
- Bigger than that: split it into separate tickets, each still a complete behavior, with `After` linking them. Example: "the page lists the customer's bookings, or says there are none", then "a booking can be cancelled", then "cancelling asks for a reason". Never one ticket with several stacked PRs.
- Well under 50 lines: merge it into a neighbouring ticket unless it stands alone.

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
- Size: ~250 lines
- After: T-02
- Branch: none yet
```

- Ticket IDs keep counting across phases: T-01, T-02… never restart.
- Every "done when" can be proved by a test or a screenshot.
- In the `## Phases` list, mark this phase `(current)` and remove the marker from the previous one. Update its goal or exit there if planning changed them.

## 6. Report

Show the phase's tickets as a short table (ID, behavior, size, after) and the lanes. Say which tickets can start now.
