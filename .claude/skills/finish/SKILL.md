---
name: finish
description: Finish a ticket and open its PR. Proves each "done when", has a separate reviewer agent review the branch, then hands the rest to a finisher agent with a fresh context, which fixes what the review found, updates the plan and decisions, opens the PR and fixes what CI and the CI review find. Run it automatically when a ticket's work is done, or when the user runs /finish.
---

# Finish a ticket

Run every step without stopping to ask, unless a step says to stop. The user sees the result at the end, with the PR already open.

Most of the work runs in two subagents, each with a fresh context. This conversation usually holds the whole build, and every model call here re-sends all of it, so keep your own part to the steps below.

## 1. Prove it's done

For each "done when" of the ticket (or of this PR, if the ticket has several), name the test, e2e test or screenshot that proves it. Write the missing ones. If one can't be met, stop and tell the user why.

## 2. Check and size

1. Run `.claude/scripts/check` and fix what fails.
2. Run `.claude/scripts/pr-size`. If it's over the limit, stop and propose how to split the work into smaller tickets that each land on `main` on their own. Never cut tests to get under it. Only a human can add the `size-exception` label.
3. Commit everything, so both agents see all of it.

## 3. Review by a separate agent

Start the `reviewer` subagent. Give it only the ticket ID and the branch name, never your own summary of the change or your reasons for it, so its review isn't shaped by yours. Wait for its report.

## 4. Hand the rest to the finisher

Start the `finisher` subagent with:

- the ticket ID and the branch name,
- the line count `pr-size` printed,
- the reviewer's report, copied exactly as it wrote it.

Add nothing else: no summary of the change, no opinion on the findings. The finisher checks each finding against the code itself. It fixes them, runs the polish passes, updates the plan and decisions, opens the PR and handles CI and the CI review. Wait for its report. Don't redo or re-check its work here, since that would bring the cost back into this conversation.

## 5. Report

Pass the finisher's report on to the user, briefly:

- The PR link, and whether its checks pass.
- What the local review found, what was fixed, and what was pushed back on.
- What CI and the CI review flagged, and what was fixed or left open for the user.
- Anything that changes later tickets.
- Next: when people comment on the PR, say "address the comments" (the `/address-review` skill). After the merge, run `.claude/scripts/ticket remove <ID>` from the main checkout.

If the finisher stopped before opening the PR, say where it stopped and why, and ask the user how to go on.
