import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './FieldError.module.css';

export interface FieldErrorProps {
  /** Referenced by the field's `aria-describedby`, so the message is read with the field. */
  id: string;
  children: ReactNode;
}

/** The message under a field that says what's wrong with its value, with an icon so colour isn't its only signal. */
export function FieldError({ id, children }: FieldErrorProps) {
  return (
    <p id={id} className={styles.error}>
      <CircleAlert aria-hidden="true" className={styles.icon} />
      <span>{children}</span>
    </p>
  );
}
