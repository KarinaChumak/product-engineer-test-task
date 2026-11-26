---
paths:
  - 'src/components/**/*.tsx'
---

- Derive values during render. Use `useEffect` only to sync with something outside React (subscriptions, timers, browser APIs), and always return a cleanup.
- Props interfaces are named `<Name>Props` and exported.
- Style with the tokens from `src/index.css` (see `.claude/DESIGN.md`), never raw hex or pixel values.
