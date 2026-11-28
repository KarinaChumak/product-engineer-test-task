import type { ChangeEvent, ReactNode } from 'react';
import { Field } from '@/components/Field';
import styles from './DateField.module.css';

export interface DateFieldProps {
  label: string;
  /** The date picked, as `YYYY-MM-DD`, or undefined while the field is empty. */
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  required?: boolean;
  /** Shown next to the label and read as the field's description, such as a tag. */
  annotation?: ReactNode;
  /** What's wrong with the value. Shown under the field, which is then marked invalid. */
  error?: ReactNode;
  /** Called when focus leaves the field. */
  onBlur?: () => void;
}

/**
 * A field for a calendar date, on the browser's own date input and picker. The browser shows the date in
 * its own language's format; the value is always `YYYY-MM-DD`.
 */
export function DateField({
  label,
  value,
  onValueChange,
  required,
  annotation,
  error,
  onBlur,
}: DateFieldProps) {
  // The input gives '' while the date is empty or only partly typed.
  function setDateFromInput(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;
    onValueChange(next === '' ? undefined : next);
  }

  return (
    <Field label={label} required={required} annotation={annotation} error={error}>
      {(controlProps) => (
        <input
          {...controlProps}
          className={styles.control}
          type="date"
          value={value ?? ''}
          onChange={setDateFromInput}
          onBlur={onBlur}
        />
      )}
    </Field>
  );
}
