import { useId, type ReactNode } from 'react';
import { NumericFormat, type NumberFormatValues, type SourceInfo } from 'react-number-format';
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

/** The locale's digit group separator, such as `,` for `en` and `.` for `de`. */
function getGroupSeparator(locale: string) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1000000);
  return parts.find((part) => part.type === 'group')?.value ?? ',';
}

// The field holds whole numbers, so it has no decimal separator. The library needs one, and cuts
// a pasted number at it, so it gets a character nobody types: `95.000` and `95,000` both keep 95000.
const UNTYPEABLE_DECIMAL_SEPARATOR = '￿';

const hasAllowedLength = ({ value }: NumberFormatValues) => value.length <= MAX_DIGITS;

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

  function setValueFromInput({ floatValue }: NumberFormatValues, { source }: SourceInfo) {
    // The library also reports changes that came from the `value` prop; only the user's count.
    if (source === 'event') onValueChange(floatValue);
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
      <NumericFormat
        id={id}
        className={styles.input}
        inputMode="numeric"
        autoComplete="off"
        value={value ?? ''}
        onValueChange={setValueFromInput}
        thousandSeparator={getGroupSeparator(locale)}
        decimalSeparator={UNTYPEABLE_DECIMAL_SEPARATOR}
        decimalScale={0}
        allowNegative={false}
        isAllowed={hasAllowedLength}
        required={required}
        aria-describedby={annotation ? annotationId : undefined}
      />
    </div>
  );
}
