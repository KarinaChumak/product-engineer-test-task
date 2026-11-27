import { useId, type ReactNode } from 'react';
import {
  NumberFormatBase,
  useNumericFormat,
  type NumberFormatValues,
  type SourceInfo,
} from 'react-number-format';
import { FieldError, joinDescriptionIds } from '@/components/FieldError';
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
  /** What's wrong with the value. Shown under the field, which is then marked invalid. */
  error?: ReactNode;
  /** Called when focus leaves the field. */
  onBlur?: () => void;
}

// Beyond this many digits a number loses precision in JavaScript.
const MAX_DIGITS = 15;

/** The locale's group and decimal separators, such as `,` and `.` for `en`. */
function getSeparators(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1000000.5);
  return {
    group: parts.find((part) => part.type === 'group')?.value ?? ',',
    decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
  };
}

// The field holds whole numbers, so every non-digit is dropped: a pasted `95.000` or `95,000`
// keeps 95000 in any locale, instead of being cut at what the library reads as a decimal point.
const keepDigits = (text: string) => text.replace(/\D/g, '');

const hasAllowedLength = ({ value }: NumberFormatValues) => value.length <= MAX_DIGITS;

/** A field for a whole number. Only digits can be entered, and the number is shown grouped for the locale. */
export function NumberField({
  label,
  value,
  onValueChange,
  locale,
  required = false,
  annotation,
  error,
  onBlur,
}: NumberFieldProps) {
  const id = useId();
  const annotationId = `${id}-annotation`;
  const errorId = `${id}-error`;

  function setValueFromInput({ floatValue }: NumberFormatValues, { source }: SourceInfo) {
    // The library also reports changes that came from the `value` prop; only the user's count.
    if (source === 'event') onValueChange(floatValue);
  }

  const separators = getSeparators(locale);
  const inputProps = useNumericFormat({
    id,
    className: styles.input,
    // The library leaves inputMode off on iPhone; a whole, positive number needs only digits there too.
    inputMode: 'numeric',
    autoComplete: 'off',
    value: value ?? '',
    onValueChange: setValueFromInput,
    onBlur,
    thousandSeparator: separators.group,
    // Unused by `keepDigits`, but the library refuses a decimal separator equal to the group one.
    decimalSeparator: separators.decimal,
    decimalScale: 0,
    allowNegative: false,
    isAllowed: hasAllowedLength,
    required,
    'aria-describedby': joinDescriptionIds(!!annotation && annotationId, !!error && errorId),
    'aria-invalid': error ? true : undefined,
  });

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
      <NumberFormatBase {...inputProps} removeFormatting={keepDigits} />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
