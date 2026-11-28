# Design guidelines

Checked by `/design-check` on any change that touches UI.

## Source: the design canvas

The look comes from the design canvas "Instaffo flow — input styles & error states": https://claude.ai/artifact/7Fcz7h2BkNLy85Jzyp5q3N. Read the board for the component you change with the Artifact tool (`action: "read"`, `path: "project/<Board>.dc.html"`) before styling it, and compare your screenshots with it in `/verify-ui`.

| Board                                                                                       | File                       | Covers                                                                                         |
| ------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| [Text & Zahlen](https://claude.ai/artifact/7Fcz7h2BkNLy85Jzyp5q3N#artboard-Main)            | `project/Main.dc.html`     | Text and textarea fields, salary field with the "Aus deinem Profil" pill (variants A–E), years |
| [Ja/Nein & Auswahl](https://claude.ai/artifact/7Fcz7h2BkNLy85Jzyp5q3N#artboard-Choices)     | `project/Choices.dc.html`  | Yes/no buttons, single select dropdown and radio cards, multi select with removable tags       |
| [Datum & Datei](https://claude.ai/artifact/7Fcz7h2BkNLy85Jzyp5q3N#artboard-DateFile)        | `project/DateFile.dc.html` | Date entry variants, file dropzone with empty, uploaded and rejected states                    |
| [Fehler- & Feldzustände](https://claude.ai/artifact/7Fcz7h2BkNLy85Jzyp5q3N#artboard-Errors) | `project/Errors.dc.html`   | Field states (default, focus, filled, from profile, error, disabled), where errors show, copy  |

The canvas says how things look. Where it shows a behavior that `claude-notes/decisions.md` settled differently, the decision wins: dates use the browser's own date input ("T-11a: Dates are picked in the browser's own date input"), and the canvas's German labels are sample copy, not the app's (copy lives in react-intl). The canvas is light only; dark values are ours, in `src/index.css`.

### What the canvas sets

- Font: Geist (400, 500, 600, 700), falling back to Arial and sans-serif. Questions 16px weight 500, hints 13px muted, page headings weight 500.
- Page: `--color-surface` background, content in white cards with `--radius-4` (16px) and 24px padding.
- Fields: 2px border, `--radius-3` (12px), 12px × 14px padding, 16px text. Focus: `--color-accent` border plus a 4px `--color-accent-soft` ring. Use `--color-field-border` for the resting border, not the canvas's `#d3d4d6`, which is only 1.5:1 against white and fails WCAG 1.4.11.
- Units ("€ / Jahr", "Jahre") sit inside the field on the right, in muted text.
- From the profile: a pill on `--color-success-soft` with `--color-on-success-soft` text and a check icon. The salary variant is still open (A, B or E, see `claude-notes/product.md`). It disappears once the value is changed.
- Selected option, menu item or yes/no button: `--color-accent` border on `--color-selected-soft`, weight 600, with a check icon in the menu. Tags for multi select: `--color-accent-soft` pill with a remove button that has an `aria-label`.
- Yes/no: two equal buttons side by side, at least 52px tall, `aria-pressed`.
- Errors: color plus icon plus text, never color alone. `--color-danger` border on the field, the message below it with an alert icon. Shown after the field is left or on submit, never while typing, and gone as soon as the value is valid. The text names the expected format ("Bitte gib eine ganze Zahl ein."), never a screening threshold ("Mindestens 5 Jahre erforderlich.").
- Send failure: a `--color-danger-soft` banner with `role="alert"` that says nothing is lost and offers "Erneut senden".
- Uploaded file: `--color-success` border on `--color-success-soft`, file name, size and a "Replace" link.

## Tokens

- Colors, spacing, radii and font sizes come from CSS custom properties in `src/index.css`. Outside that file: no raw hex values, and no pixel sizes except 1px and 2px borders and outlines.
- Spacing uses the 4px scale: `--space-1` (4px) through `--space-8` (32px).
- A canvas value with no token yet gets one in `src/index.css`, with a light and a dark value, in the change that first needs it.

## Layout

- Works from 320px wide with no horizontal scroll.
- Touch targets are at least 44×44px.

## States

- Every async view has loading, empty and error states. Errors say what happened and what the user can do next.
- Destructive actions ask for confirmation or offer undo.

## Accessibility

- WCAG 2.2 AA contrast: 4.5:1 for body text, 3:1 for large text and UI controls.
- Every interactive element is reachable and operable by keyboard, with a visible focus ring.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## Copy

- Sentence case for buttons and headings. Buttons say what they do ("Save changes", not "OK").
