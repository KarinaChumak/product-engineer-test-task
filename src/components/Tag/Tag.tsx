import type { ReactNode } from 'react';
import styles from './Tag.module.css';

export interface TagProps {
  children: ReactNode;
  /** A small icon before the text, such as a Lucide icon with `aria-hidden`. */
  icon?: ReactNode;
}

/** A small pill that labels something, such as where a value came from. */
export function Tag({ children, icon }: TagProps) {
  return (
    <span className={styles.tag}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
