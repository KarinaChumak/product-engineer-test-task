---
name: verify-ui
description: Run the app in a real browser, screenshot the screens the current branch touches at mobile and desktop widths, and check for console errors, broken states and layout problems. Use after any change to src/ that affects what renders, before saying a UI change is done.
allowed-tools: [Read, Glob, Grep, Bash]
---

Tests and typechecks don't catch a blank screen, a broken layout or a console error. This does.

1. From `git diff --name-only $(git merge-base HEAD main)` and untracked files, list the routes or screens the change affects. If unsure, use `/`.
2. Make sure Chromium is installed: `pnpm exec playwright install chromium`.
3. Start the dev server in the background with `.claude/scripts/dev`. It uses `PORT` (default 5173), so it doesn't collide with another dev server. Wait until `curl -sf http://localhost:${PORT:-5173}` succeeds.
4. For each screen, take both screenshots:
   - `pnpm exec playwright screenshot --viewport-size=390,844 --full-page http://localhost:${PORT:-5173}<route> .verify/<slug>-mobile.png`
   - `pnpm exec playwright screenshot --viewport-size=1280,800 --full-page http://localhost:${PORT:-5173}<route> .verify/<slug>-desktop.png`
   - Add `--color-scheme=dark` versions if the change touched colors.
5. Run `.claude/scripts/e2e` to catch console errors and broken interactions. The smoke test fails on any console error.
6. Read every screenshot. Check that the change is visible, nothing overlaps or overflows, there's no horizontal scroll on mobile, and loading, empty and error states look right if the change touched them. Compare each screen with its board on the design canvas (the table in `.claude/DESIGN.md`, read with the Artifact tool), or with a mockup the user gave, and list where they differ.
7. Stop the dev server.

## Report

- For each screen: the screenshot paths and one line on what you saw.
- The `.claude/scripts/e2e` result.
- Anything wrong. Fix it and rerun from step 4, or say plainly what still doesn't look right.
