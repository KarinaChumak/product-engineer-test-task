import type { ReactNode } from 'react';
import styles from './Page.module.css';

export interface PageProps {
  children: ReactNode;
}

/** The page's `<main>`: centred, at most `--page-width` wide, its sections spaced apart. */
export function Page({ children }: PageProps) {
  return <main className={styles.page}>{children}</main>;
}
