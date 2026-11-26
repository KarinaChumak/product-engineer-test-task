import { useId, type ChangeEvent, type ReactNode } from 'react';
import styles from './NumberField.module.css';

export interface NumberFieldProps {
  label: string;
  /** A whole number, or undefined while the field is empty. */
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  /** The locale whose digit grouping the field shows, such as `en` (95,000) or `de` (95.000). */
  locale: string;
  required?: boolean;
  /** Shown next to the label and read as the field's description, such as a tag. */
  annotation?: ReactNode;
}

// Beyond this many digits a number loses precision in JavaScript.
const MAX_DIGITS = 15;

const digitsIn = (text: string) => text.replace(/\D/g, '');

/** The caret position in `formatted` just after its `count`-th digit. */
function caretAfterDigits(formatted: string, count: number): number {
  if (count === 0) return 0;
  let seen = 0;
  for (const [index, char] of [...formatted].entries()) {
    if (/\d/.test(char) && ++seen === count) return index + 1;
  }
  return formatted.length;
}

/** A field for a whole number. Only digits can be entered, and the number is shown grouped for the locale. */
export function NumberField({
  label,
  value,
  onValueChange,
  locale,
  required = false,
  annotation,
}: NumberFieldProps) {
  const id = useId();
  const annotationId = `${id}-annotation`;
  const format = (number: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(number);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = digitsIn(input.value.slice(0, caret)).length;
    const digits = digitsIn(input.value).slice(0, MAX_DIGITS);
    const next = digits === '' ? undefined : Number(digits);
    const formatted = next === undefined ? '' : format(next);

    // Write the formatted text and caret now, so the caret stays after the digit just typed
    // instead of jumping to the end when separators appear or a non-digit is dropped.
    input.value = formatted;
    const position = caretAfterDigits(formatted, Math.min(digitsBeforeCaret, digits.length));
    input.setSelectionRange(position, position);
    onValueChange(next);
  }

  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' *'}
            </span>
          )}
        </label>
        {annotation && <span id={annotationId}>{annotation}</span>}
      </div>
      <input
        id={id}
        className={styles.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value === undefined ? '' : format(value)}
        onChange={handleChange}
        required={required}
        aria-describedby={annotation ? annotationId : undefined}
      />
    </div>
  );
}
