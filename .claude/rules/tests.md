---
paths:
  - 'src/**/*.test.tsx'
  - 'src/**/*.test.ts'
---

- Use `screen` queries by role, label or text. `getByTestId` only when nothing the user can see identifies the element.
- Drive interactions with `userEvent.setup()`, not `fireEvent`.
- Render pages with `renderAt('/path')` from `@/test/render`, so tests go through the real routes and providers. `render` is for a single component.
- Mock the API with MSW: each test declares its answers with `server.use(http.get('/api/...', () => HttpResponse.json(...)))` from `@/test/server`. Never stub `fetch` or mock the app's own hooks. A request with no handler fails the test.
- Don't mock or silence `console`. If code logs during a test, fix the code or the test. ESLint enforces this and the `fetch` rule.
- One behavior per test, named after what the user sees ("shows an error when saving fails").
