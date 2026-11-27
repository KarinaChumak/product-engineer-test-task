import type { ReactNode } from 'react';
import styles from './Notice.module.css';

export interface NoticeProps {
  title: ReactNode;
  description: ReactNode;
  /** `alert` for a failure the user should hear about right away, `status` for an outcome they caused. */
  role?: 'alert' | 'status';
  /** What the user can do next, such as a "Try again" button. */
  action?: ReactNode;
}

/** A whole-page message in place of the content, such as "Job not found". */
export function Notice({ title, description, role, action }: NoticeProps) {
  return (
    <section role={role} className={styles.notice}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {action}
    </section>
  );
}
