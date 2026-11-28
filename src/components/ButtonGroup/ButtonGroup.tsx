import type { ReactNode } from 'react';
import styles from './ButtonGroup.module.css';

export interface ButtonGroupProps {
  /** The buttons, in reading order. The last one is the main action and sits at the end of the row. */
  children: ReactNode;
}

/** Lays buttons out in a row, the first at the start and the last at the end, wrapping on narrow screens. */
export function ButtonGroup({ children }: ButtonGroupProps) {
  return <div className={styles.group}>{children}</div>;
}
