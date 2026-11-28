import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: ReactNode;
  /** A short muted line above the title, such as where the section sits in a sequence. */
  eyebrow?: ReactNode;
}

/** The heading of a section inside a page, one level below `PageHeader`. */
export function SectionHeader({ title, eyebrow }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h2 className={styles.title}>{title}</h2>
    </header>
  );
}
