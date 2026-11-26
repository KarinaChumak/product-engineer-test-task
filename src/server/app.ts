import { Hono } from 'hono';
import type { JobSource } from '@/server/jobs';
import { toJobQuestionnaire, type Warn } from '@/server/normalize';

export interface AppDeps {
  loadJob: JobSource;
  warn: Warn;
}

export function createApp({ loadJob, warn }: AppDeps) {
  const app = new Hono();

  app.get('/api/jobs/:id/questionnaire', async (c) => {
    const id = c.req.param('id');
    const config = await loadJob(id);
    if (config === undefined) return c.json({ error: 'not_found' }, 404);

    return c.json(toJobQuestionnaire(config, (message) => warn(`[${id}] ${message}`)));
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'internal' }, 500);
  });

  return app;
}
