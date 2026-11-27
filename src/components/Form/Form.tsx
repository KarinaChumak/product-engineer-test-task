import type { ReactNode } from 'react';
import styles from './Form.module.css';

export interface FormProps {
  children: ReactNode;
  /** Called when the form is submitted, by its submit button or Enter in a field. */
  onSubmit: () => void;
  /** The form's accessible name, so it's listed as a form landmark. */
  label?: string;
}

/**
 * A form laid out as a column. It leaves checking the input to the app (no browser validation bubbles)
 * and never reloads the page on submit.
 */
export function Form({ children, onSubmit, label }: FormProps) {
  return (
    <form
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
