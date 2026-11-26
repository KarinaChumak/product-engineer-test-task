---
name: scaffold-component
description: Create a new generic React component under src/components/ with its styles, co-located test and index export. Use when the user asks for a new component, or when a page or feature needs a look no component has.
allowed-tools: [Read, Write, Edit, Glob, Bash]
---

Given a component name in PascalCase, create under `src/components/<Name>/`:

1. `<Name>.tsx`: a function component with an exported `<Name>Props` interface and a named export.
2. `<Name>.module.css`: its styles as a CSS Module, using the tokens from `src/index.css`. Variants are props mapped to classes, as in `Tag`.
3. `<Name>.test.tsx`: a Testing Library test that renders the component and asserts on what the user sees, queried by role.
4. `index.ts`: re-exports the component and its props type.

The component is generic. Pick the name a design system would use (Badge, Header, Dialog), and give props UI names (`hint`, `tone`, `label`), never product words. Check `src/components/` first: extending an existing component with a prop is often better than a new one.

Follow `src/components/Tag/` as the reference. Import with the `@/components/...` alias.

## Before reporting done

1. Run `pnpm lint src/components/<Name>` and fix every error.
2. Run `.claude/scripts/test src/components/<Name>` and make it pass.
3. Report both commands and their final output.
