# Working in this repo with Claude Code

For people. Claude's own instructions are in `CLAUDE.md`, the skills and the hooks. The notes (the plan, the product brief and the decision log) are in `claude-notes/`.

## The loop

Tickets are built a feature at a time (a few tickets that make one behavior) and reviewed as stacked PRs, one per ticket. See "The rest of the task is built in features and reviewed as stacked PRs" in `claude-notes/decisions.md`.

| Step             | You                                                                                              | Claude                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan             | Run `/kickoff` with the idea, and answer its questions                                           | Reads what exists, asks about the decisions that shape everything, and writes the product brief, the decision log and the plan, with Phase 1 broken into tickets                                                                                    |
| Build a feature  | Say "next feature", then OK the one check-in                                                     | Picks the next two to four related tickets and checks in once with the approach and any choice you'd see. Then builds them without stopping, one slice branch per ticket, each on top of the one before, in one worktree                            |
| Finish it        | Nothing: it starts on its own when the last slice is built (or run `/finish`)                    | Runs `check`, a separate reviewer agent and the finisher once for the whole feature, with the UI checks. Puts each fix on its slice, opens one stacked PR per slice (the bottom one on `main`) and handles CI. It can start the next feature on top |
| Review the PRs   | On GitHub, bottom PR first: read and comment. End a comment with `#` to make it a permanent rule | The CI review comments on each PR too                                                                                                                                                                                                               |
| Fix the comments | Say "address the comments on #N"                                                                 | Adds fix commits on that PR's branch, then rebases the branches above it onto it and force-pushes them. Disagreements stay open for you                                                                                                             |
| Merge            | On GitHub, bottom up, with a merge commit (not squash)                                           | Nothing. Claude never merges                                                                                                                                                                                                                        |
| Clean up         | Delete the merged branches; GitHub retargets the next PR to `main`                               | Nothing                                                                                                                                                                                                                                             |
| Plan ahead       | Run `/plan-phase` when a phase is nearly done                                                    | Breaks the next phase into tickets, using what the last one taught                                                                                                                                                                                  |

One session builds the stack, in one worktree. Context is compacted automatically.

## Before handing the project over

Run through this before a demo, a hand-in, or passing the repo to someone else.

- [ ] `.claude/scripts/check` passes on `main`, and CI is green.
- [ ] The README says how to install, run and test the project, in commands that work on a fresh clone.
- [ ] Every ticket in `claude-notes/plan.md` has its real status, and finished ones have an `Outcome`.
- [ ] The decision log covers every choice another person would ask about, with the reason and what was rejected.
- [ ] `claude-notes/product.md` lists what's out of scope and the open questions that are left.
- [ ] No secrets in the repo: `.env` is gitignored, and `.env.example` lists every variable.
- [ ] No leftovers: `.claude/ai-setup-pending/` is gone, no worktrees are left (`git worktree list`), no stray branches.
- [ ] `.claude/` is committed. If the notes live outside the repo (`~/claude-notes/`) and the people you hand over to should see the plan and decisions, share them or move them in with `init --notes in-repo`.
