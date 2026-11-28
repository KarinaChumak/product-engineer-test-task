import { useId, type ReactNode } from 'react';
import { FieldError, joinDescriptionIds } from '@/components/FieldError';
import styles from './Field.module.css';

/** What `Field` puts on its control, so the label, description and error are read with it. */
export interface FieldControlProps {
  id: string;
  required: boolean;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

export interface FieldProps {
  label: string;
  required?: boolean;
  /** Shown next to the label and read as the control's description, such as a tag. */
  annotation?: ReactNode;
  /** What's wrong with the value. Shown under the control, which is then marked invalid. */
  error?: ReactNode;
  /** Renders the control, spreading the props it's given onto the focusable element. */
  children: (controlProps: FieldControlProps) => ReactNode;
}

/** A labelled control: the label with its required mark and annotation above it, and its error below. */
export function Field({ label, required = false, annotation, error, children }: FieldProps) {
  const id = useId();
  const annotationId = `${id}-annotation`;
  const errorId = `${id}-error`;

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
      {children({
        id,
        required,
        'aria-describedby': joinDescriptionIds(!!annotation && annotationId, !!error && errorId),
        'aria-invalid': error ? true : undefined,
      })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
