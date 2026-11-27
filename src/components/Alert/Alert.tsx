import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  children: ReactNode;
}

/** An inline error message, announced when it appears, with an icon so colour isn't its only signal. */
export function Alert({ children }: AlertProps) {
  return (
    <div role="alert" className={styles.alert}>
      <CircleAlert aria-hidden="true" className={styles.icon} />
      <p className={styles.text}>{children}</p>
    </div>
  );
}
