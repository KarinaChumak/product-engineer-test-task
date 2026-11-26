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
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const shown = value === undefined ? '' : formatter.format(value);

  function setNumberFromInput(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const caret = input.selectionStart ?? input.value.length;
    let digitsBeforeCaret = digitsIn(input.value.slice(0, caret)).length;
    let digits = digitsIn(input.value);

    // Deleting a separator alone would change nothing, so delete the digit beside it instead.
    if (digits === digitsIn(shown) && input.value.length < shown.length) {
      const { inputType } = event.nativeEvent as InputEvent;
      if (inputType === 'deleteContentBackward' && digitsBeforeCaret > 0) {
        digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
        digitsBeforeCaret -= 1;
      } else if (inputType === 'deleteContentForward') {
        digits = digits.slice(0, digitsBeforeCaret) + digits.slice(digitsBeforeCaret + 1);
      }
    }

    // Refuse a digit that would make the number too long to keep exactly.
    if (digits.length > MAX_DIGITS) {
      input.value = shown;
      const position = Math.max(caret - 1, 0);
      input.setSelectionRange(position, position);
      return;
    }

    const next = digits === '' ? undefined : Number(digits);
    const formatted = next === undefined ? '' : formatter.format(next);

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
        value={shown}
        onChange={setNumberFromInput}
        required={required}
        aria-describedby={annotation ? annotationId : undefined}
      />
    </div>
  );
}
