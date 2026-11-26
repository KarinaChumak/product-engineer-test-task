import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import failOnConsole from 'vitest-fail-on-console';
import { server } from '@/test/server';

// A warning or error logged during a test fails it, so tests never need to spy on the console.
failOnConsole({ shouldFailOnWarn: true, shouldFailOnError: true });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
