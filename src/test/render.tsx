import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';

/**
 * Renders inside a fresh query client per test, without retries or the app's request logging. The
 * client comes back as `queryClient`, so a test can wait for a request that changes nothing on screen.
 */
export function render(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { ...rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>), queryClient };
}

/** Renders the app's routes at `path`, as if the candidate opened that URL. */
export function renderAt(path: string) {
  return render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}
