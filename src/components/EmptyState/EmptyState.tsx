import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  children: ReactNode;
  /** A decorative icon above the text, such as a Lucide icon with `aria-hidden`. */
  icon?: ReactNode;
}

/** Says that a list or section has nothing to show yet. */
export function EmptyState({ children, icon }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <p className={styles.text}>{children}</p>
    </div>
  );
}
