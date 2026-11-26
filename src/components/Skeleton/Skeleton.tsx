import type { ReactNode } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Read by screen readers only, so nothing visible changes when the content's language does. */
  label: ReactNode;
}

/** A placeholder in the shape of a page header and a field, shown while the page loads. */
export function Skeleton({ label }: SkeletonProps) {
  return (
    <div role="status" className={styles.skeleton}>
      <span className={styles.label}>{label}</span>
      <span aria-hidden="true" className={`${styles.bar} ${styles.eyebrow}`} />
      <span aria-hidden="true" className={`${styles.bar} ${styles.title}`} />
      <span aria-hidden="true" className={`${styles.bar} ${styles.field}`} />
    </div>
  );
}
