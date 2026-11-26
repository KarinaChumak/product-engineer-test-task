---
paths:
  - 'src/components/**/*.tsx'
---

- Components here are generic building blocks. Names and props use UI words (`hint`, `tone`, `label`, `action`), never product words: a Select takes a `hint`, not a `profileNote`. Product-specific components go in `src/app/`.
- Use the names design systems use: Dialog, Header, Text, Badge. Not Popup or Paragraph.
- Each component's styles are in its own `<Name>.module.css`, with the tokens from `src/index.css` (see `.claude/DESIGN.md`), never raw hex or pixel values. Variants are props (`tone="muted"`), not class names passed in from outside.
- Derive values during render. Use `useEffect` only to sync with something outside React (subscriptions, timers, browser APIs), and always return a cleanup.
- Props interfaces are named `<Name>Props` and exported.
