import type { ReactNode } from 'react';
import styles from './Tag.module.css';

export interface TagProps {
  children: ReactNode;
  /** A small icon before the text, such as a Lucide icon with `aria-hidden`. */
  icon?: ReactNode;
  /** `success` is the green pill for something confirmed, such as a value that came from the profile. */
  tone?: 'neutral' | 'success';
}

/** A small pill that labels something, such as where a value came from. */
export function Tag({ children, icon, tone = 'neutral' }: TagProps) {
  return (
    <span className={tone === 'success' ? `${styles.tag} ${styles.success}` : styles.tag}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
