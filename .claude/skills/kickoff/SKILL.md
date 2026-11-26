---
name: kickoff
description: Start a new project or a big new area of one. Turns a vague idea into settled decisions, a product brief and a phased plan with only the first phase broken into tickets. Use when the user describes a project or a large feature to start, or runs /kickoff.
---

# Kickoff

The goal is to settle the decisions that shape everything else before any code is written, and to plan only as far ahead as is useful. Expect the plan to change as you learn.

## 1. Read what exists

Read before asking, so your questions are about decisions, not facts you could look up:

- The user's description of the idea, and any brief, spec, mockup or ticket they point to.
- The repo: README, `.claude/CLAUDE.md`, `claude-notes/decisions.md`, existing code and data files.
- `claude-notes/product.md` and `claude-notes/plan.md` if they exist. If they do, this is a kickoff for a new area: add to them instead of starting over, and ask the user first.

## 2. List the decisions, then interview

Write down every open question whose answer would change the architecture, the data model, the main user flows or the scope. Examples: how users and their data are separated, how people sign in, whether data is computed live or ahead of time, which roles exist, what the first release leaves out.

Present each one as a decision, not an open question:

> **Multi-tenancy:** one database with an `org_id` on every row (recommended: simplest to run, fine until a customer needs isolation) / a schema per org / a database per org.

- Give 2–4 options, mark one recommended, and say why in one line.
- Ask 2–4 at a time, biggest first. Wait for answers before the next batch.
- When the user says "your call", take your recommendation and say so.
- Small decisions (copy, defaults, formatting) are not for kickoff. They get made inside tickets.
- Stop when the remaining questions don't change Phase 1.

## 3. Write the files

1. **`claude-notes/product.md`** from [product-template.md](product-template.md): problem, users, principles, scope, out of scope, open questions. Keep it to one page.
2. **`claude-notes/decisions.md`**: add one entry per decision at the end of the file, in its existing format, with `Kickoff` as the ID:

   ```markdown
   ## Kickoff: Multi-tenancy

   One database, `org_id` on every row. Why: simplest to run. Rejected: schema per org, database per org.
   ```

3. **`claude-notes/plan.md`** in the layout of [plan-template.md](../plan-phase/plan-template.md): every phase in the `## Phases` list with a one-line goal and exit. Then break down **Phase 1 only**, following the `/plan-phase` skill. Phase 1 is a walking skeleton: the thinnest version that works end to end, so the shared pieces exist before tickets run in parallel.

## 4. Report

Summarize in a few lines: the decisions made, the phases, and Phase 1's tickets with which can run in parallel. Say which open questions are left and when they need an answer. Suggest starting with "work on ticket T-01".
