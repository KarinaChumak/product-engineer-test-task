import { serve } from '@hono/node-server';
import { createApp } from '@/server/app';

const port = Number(process.env.API_PORT ?? 8787);
const app = createApp();

// Loopback only: Vite proxies /api from localhost, and nothing else should reach the API.
serve({ fetch: app.fetch, port, hostname: 'localhost' }, () =>
  console.log(`API listening on http://localhost:${port}`),
);
