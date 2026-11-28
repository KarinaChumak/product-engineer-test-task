---
name: design-check
description: Check the UI parts of the current branch against .claude/DESIGN.md (tokens, layout, states, accessibility, copy) and fix violations. Use when the branch touches .tsx or .css files under src/.
allowed-tools: [Read, Edit, Grep, Glob, Bash]
---

1. Read `.claude/DESIGN.md`.
2. Find the changed UI files: `git diff --name-only $(git merge-base HEAD main) -- 'src/**/*.tsx' 'src/**/*.css'`, plus untracked ones from `git ls-files --others --exclude-standard src`. For each changed component, read its board on the design canvas (the table in `.claude/DESIGN.md`) with the Artifact tool, and check the component against it: borders, radii, spacing, states and copy rules. If the canvas can't be read, say so in the report and check against `.claude/DESIGN.md` alone.
3. Run the mechanical checks first:
   - `.claude/scripts/raw-styles` lists added lines with raw hex colors or pixel sizes outside `src/index.css`.
   - Interactive elements (`button`, `a`, `input`, anything with `onClick`) have an accessible name and work by keyboard.
   - Views that load data render loading, empty and error states.
4. Then read each changed file against the rest of `.claude/DESIGN.md`: layout, contrast, focus, motion, copy.
5. Report each violation as `file:line — rule — fix`, then fix it.
6. Run `.claude/scripts/check` and report the result.

If there are no violations, say "No design issues." and stop.
