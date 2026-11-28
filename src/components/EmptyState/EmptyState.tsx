import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** What the user can do about it, after `title` says what is empty. */
  children: ReactNode;
  /** A decorative icon above the text, such as a Lucide icon with `aria-hidden`. */
  icon?: ReactNode;
  /** A short heading that says what is empty, one level below the page heading. */
  title?: ReactNode;
}

/** Says that a list or section has nothing to show yet. */
export function EmptyState({ children, icon, title }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {title && <h2 className={styles.title}>{title}</h2>}
      <p className={styles.text}>{children}</p>
    </div>
  );
}
