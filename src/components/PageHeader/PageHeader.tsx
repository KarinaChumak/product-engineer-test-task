import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: ReactNode;
  /** A short line above the title, such as the company. */
  eyebrow?: ReactNode;
}

export function PageHeader({ title, eyebrow }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
