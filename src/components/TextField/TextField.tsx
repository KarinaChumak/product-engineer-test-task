import { useId, type ChangeEvent, type ReactNode } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps {
  label: string;
  /** The text entered, or undefined while the field is empty. */
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  /** Shows a textarea that grows with its content instead of a single-line field. */
  multiline?: boolean;
  required?: boolean;
  /** Shown next to the label and read as the field's description, such as a tag. */
  annotation?: ReactNode;
}

/** A field for free text, on one line or, with `multiline`, in a textarea that grows as the text does. */
export function TextField({
  label,
  value,
  onValueChange,
  multiline = false,
  required = false,
  annotation,
}: TextFieldProps) {
  const id = useId();
  const annotationId = `${id}-annotation`;
  const text = value ?? '';

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = event.currentTarget.value;
    onValueChange(next === '' ? undefined : next);
  }

  const controlProps = {
    id,
    value: text,
    onChange: handleChange,
    required,
    'aria-describedby': annotation ? annotationId : undefined,
  };

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
      {multiline ? (
        <div className={styles.grower}>
          <textarea {...controlProps} className={`${styles.control} ${styles.textarea}`} rows={3} />
          {/* An invisible copy of the text in the same grid cell: it sets the height the textarea grows to.
              The trailing space keeps a final empty line from collapsing. */}
          <span className={`${styles.control} ${styles.textarea} ${styles.replica}`} aria-hidden="true">
            {`${text} `}
          </span>
        </div>
      ) : (
        <input {...controlProps} className={styles.control} type="text" />
      )}
    </div>
  );
}
