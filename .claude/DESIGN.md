# Design guidelines

Checked by `/design-check` on any change that touches UI. Replace these defaults with your design system.

## Tokens

- Colors, spacing, radii and font sizes come from CSS custom properties in `src/index.css`. Outside that file: no raw hex values, and no pixel sizes except 1px and 2px borders and outlines.
- Spacing uses the 4px scale: `--space-1` (4px) through `--space-8` (32px).

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
