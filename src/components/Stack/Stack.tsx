import type { ReactNode } from 'react';
import styles from './Stack.module.css';

export interface StackProps {
  children: ReactNode;
  /** The space between children, a step on the spacing scale. */
  gap?: 4 | 6 | 8;
}

/** Lays its children out in a column with even space between them. */
export function Stack({ children, gap = 6 }: StackProps) {
  return <div className={`${styles.stack} ${styles[`gap${gap}`]}`}>{children}</div>;
}
