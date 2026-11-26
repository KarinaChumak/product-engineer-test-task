import { setupServer } from 'msw/node';

/**
 * The mock API for client tests. It starts with no handlers: each test declares the responses it
 * needs with `server.use(http.get(...))`, and any request without a handler fails the test (MSW v3 calls these unhandled frames).
 */
export const server = setupServer();
