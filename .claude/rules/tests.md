---
paths:
  - 'src/**/*.test.tsx'
  - 'src/**/*.test.ts'
---

- Use `screen` queries by role, label or text. `getByTestId` only when nothing the user can see identifies the element.
- Drive interactions with `userEvent.setup()`, not `fireEvent`.
- Mock the network at the fetch boundary, not the component's own hooks.
- One behavior per test, named after what the user sees ("shows an error when saving fails").
