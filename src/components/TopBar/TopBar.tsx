import type { ReactNode } from 'react';
import styles from './TopBar.module.css';

export interface TopBarProps {
  /** The accessible name of the navigation landmark, such as "Jobs". */
  label: string;
  children: ReactNode;
}

/** A navigation strip above the page, its content in the top-left corner. */
export function TopBar({ label, children }: TopBarProps) {
  return (
    <nav aria-label={label} className={styles.bar}>
      {children}
    </nav>
  );
}
