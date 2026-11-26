import { serve } from '@hono/node-server';
import { createApp } from '@/server/app';
import { jobsFromDirectory } from '@/server/jobs';
import { profileFromFile } from '@/server/prefill';

const port = Number(process.env.API_PORT ?? 8787);

const app = createApp({
  loadJob: jobsFromDirectory('jobs'),
  loadProfile: () => profileFromFile('profile.json'),
  warn: (message) => console.warn(`normalize: ${message}`),
});

serve({ fetch: app.fetch, port }, () => console.log(`API listening on http://localhost:${port}`));
