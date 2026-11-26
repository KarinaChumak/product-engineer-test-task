---
name: scaffold-component
description: Create a new React component under src/components/ with its co-located test and index export. Use when the user asks for a new component.
allowed-tools: [Read, Write, Edit, Glob, Bash]
---

Given a component name in PascalCase, create under `src/components/<Name>/`:

1. `<Name>.tsx`: a function component with an exported `<Name>Props` interface and a named export.
2. `<Name>.test.tsx`: a Testing Library test that renders the component and asserts on what the user sees, queried by role.
3. `index.ts`: re-exports the component and its props type.
4. `<Name>.css` only if the component needs styles, using the tokens from `src/index.css`.

Follow `src/components/Button/` as the reference. Import with the `@/components/...` alias.

## Before reporting done

1. Run `pnpm lint src/components/<Name>` and fix every error.
2. Run `.claude/scripts/test src/components/<Name>` and make it pass.
3. Report both commands and their final output.
