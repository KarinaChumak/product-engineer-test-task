---
name: finish
description: Finish a ticket and open its PR. Proves each "done when", has a separate reviewer agent review the branch, fixes what it finds, updates the plan and decisions, opens the PR, then fixes what CI and the CI review find. Run it when the user runs /finish, in a fresh context after /clear; when a ticket's work is done, ask the user to type /clear and then /finish instead of running it in the build conversation.
---

# Finish a ticket

Run every step without stopping to ask, unless a step says to stop. The user sees the result at the end, with the PR already open.

## 0. Start from a fresh context

Every step below works from the branch and the notes, not from the conversation that built the ticket. Every model call re-sends the whole conversation, so running these steps at the end of a long build costs several times as much as running them fresh.

If you wrote this ticket's code earlier in this conversation, commit everything and stop. Tell the user: "Type `/clear`, then `/finish`." After `/clear`, the SessionStart hook puts the ticket's section back in context.

Skip this step when the conversation is already fresh: it began with `/finish`, or just after `/clear` or a compaction.

## 1. Prove it's done

For each "done when" of the ticket (or of this PR, if the ticket has several), name the test, e2e test or screenshot that proves it. Write the missing ones. If one can't be met, stop and tell the user why.

## 2. Check and size

1. Run `.claude/scripts/check` and fix what fails.
2. Run `.claude/scripts/pr-size`. If it's over the limit, stop and propose how to split the work into smaller tickets that each land on `main` on their own. Never cut tests to get under it. Only a human can add the `size-exception` label.

Commit what you have before the review, so the reviewer sees all of it.

## 3. Local review by a separate agent

The review must come from an agent that didn't write the code. Start the `reviewer` subagent. It has its own context and reads the branch itself. Give it only the ticket ID and branch name, never your own summary of the change or your reasons for it, so its review isn't shaped by yours.

Then go through its findings yourself:

- **Fix** every finding that holds up when you check it against the code. When it's a class of problem, fix every instance.
- **Push back** on a finding that's wrong, and note why with the evidence. Don't change the code for it.
- Nits: fix the ones that are cheap and clearly better; skip the rest and note them.

Commit the fixes with messages that say what changed.

## 4. Polish

The reviewer and the CI review both read every branch. Run the extra passes only where they find things those reviews don't, using the line count `pr-size` printed in step 2:

1. `/simplify`: only when the branch changes more than 150 lines. Commit what it changes.
2. `design-check`: when the branch changes a `.tsx` or `.css` file under `src/` (CLAUDE.md requires it for UI changes).
3. `verify-ui`: when the branch changes what renders. Keep the screenshot paths for the PR description.
4. If any of these changed code, run `.claude/scripts/check` again.

Say in the PR description which passes you skipped and why.

## 5. Update the plan

In the ticket's section in `claude-notes/plan.md`. Find its line with `grep -n '^### <ID> ' claude-notes/plan.md` and read only that section (Read with `offset` and `limit`), not the whole file:

- `Status: in review`, or `in progress (PR 1 of 2 in review)` when more PRs follow.
- Add an `Outcome:` line: what was built, in one or two sentences, and anything that changes later tickets. `/plan-phase` reads it.
- If the work showed that a later ticket needs to change, say so in the report; don't rewrite other tickets yourself.

## 6. Record global decisions

A decision is global if another ticket has to follow it: a shared contract, a data shape, a library, a pattern for a kind of code. Choices that only affect this ticket are not recorded.

Add each one at the end of `claude-notes/decisions.md`, keyed by the ticket ID. Read only the last 20 lines to place it (Read with `offset`):

```markdown
## T-04: Date ranges in the URL

Filters live in the query string (`?from=&to=`), not in local state. Why: reload and sharing keep them. Rejected: localStorage.
```

To change an earlier decision, add a new entry that says which one it supersedes. Don't edit old entries.

## 7. Open the PR

1. Commit everything, including the notes if they're in the repo.
2. Write the description in the format of `.github/pull_request_template.md`:
   - **Why:** the ticket ID and title.
   - **Testing:** how each "done when" was proved, the `check` result, and screenshot paths.
   - **Decisions:** the new entries.
   - **Local review:** how many findings the reviewer agent reported, one line per finding that was fixed, and each one you pushed back on with the reason.
3. Push the branch and open the PR, ready for review: `gh pr create --base main --title "<ID>: <what the PR changes>" --body-file <file>`. Keep the title to a few words a reviewer can scan, such as `T-04: Date range filter on the dashboard`, not a user story. If the branch already has a PR, update its description instead. Opening it starts the CI review, if the repo has one.

Never merge the PR, and don't turn on auto-merge.

## 8. Wait for CI and the CI review

Don't hand the PR over while CI or the CI review can still ask for changes.

1. Wait for the PR's checks to finish, the CI review among them: `gh pr checks <number> --watch`. It takes minutes, so run it in the background if you can. If the PR has no checks, skip to the report.
2. If a check failed, read its log (`gh run view <run-id> --log-failed`), fix the cause, run `.claude/scripts/check`, commit and push.
3. If the PR has unresolved review threads or new review comments, run the `/address-review` skill.
4. If you pushed, wait for the checks once more and fix what fails. The CI review doesn't run again on a push, so don't wait for new comments.

## 9. Report

Tell the user, briefly:

- The PR link, and that its checks pass.
- What the local review found, what was fixed, and what you pushed back on.
- What CI and the CI review flagged, and what you fixed or left open for the user.
- Anything that changes later tickets.
- Next: when people comment on the PR, say "address the comments" (the `/address-review` skill). After the merge, run `.claude/scripts/ticket remove <ID>` from the main checkout.
