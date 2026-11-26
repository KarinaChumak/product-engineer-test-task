import { serve } from '@hono/node-server';
import { createApp } from '@/server/app';
import { jobsFromDirectory } from '@/server/jobs';
import { profileFromFile } from '@/server/prefill';

const port = Number(process.env.API_PORT ?? 8787);

const app = createApp({
  loadJob: jobsFromDirectory('jobs', (message) => console.warn(`jobs: ${message}`)),
  loadProfile: () => profileFromFile('profile.json'),
  warn: (message) => console.warn(`normalize: ${message}`),
});

// Loopback only: Vite proxies /api from localhost, and nothing else should reach the API.
serve({ fetch: app.fetch, port, hostname: 'localhost' }, () =>
  console.log(`API listening on http://localhost:${port}`),
);
