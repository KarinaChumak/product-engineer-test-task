import { Hono } from 'hono';
import type { JobSource } from '@/server/jobs';
import { toJobQuestionnaire, type Warn } from '@/server/normalize';
import type { Profile } from '@/server/prefill';

export interface AppDeps {
  loadJob: JobSource;
  loadProfile: () => Promise<Profile>;
  warn: Warn;
}

export function createApp({ loadJob, loadProfile, warn }: AppDeps) {
  const app = new Hono();

  app.get('/api/jobs/:id/questionnaire', async (c) => {
    const id = c.req.param('id');
    const config = await loadJob(id);
    if (config === undefined) return c.json({ error: 'not_found' }, 404);

    return c.json(toJobQuestionnaire(config, (message) => warn(`[${id}] ${message}`), await loadProfile()));
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'internal' }, 500);
  });

  return app;
}
