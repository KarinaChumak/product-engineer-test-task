import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Form.module.css';

export interface FormProps {
  children: ReactNode;
  /** Called when the form is submitted, by its submit button or Enter in a field. */
  onSubmit: () => void;
  /** The form's accessible name, so it's listed as a form landmark. */
  label?: string;
  /**
   * Each new value moves focus to the first field marked `aria-invalid`, once the fields show their errors.
   * Count it up after a submit that found invalid fields. 0, the default, moves nothing.
   */
  invalidFocusRequest?: number;
}

/**
 * A form laid out as a column. It leaves checking the input to the app (no browser validation bubbles)
 * and never reloads the page on submit.
 */
export function Form({ children, onSubmit, label, invalidFocusRequest = 0 }: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Focus is the browser's, so it moves after React has marked the fields invalid.
  useEffect(() => {
    if (invalidFocusRequest === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [invalidFocusRequest]);

  return (
    <form
      ref={formRef}
      noValidate
      aria-label={label}
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
