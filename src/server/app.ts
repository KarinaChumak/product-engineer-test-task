import { Hono } from 'hono';
import { jobsFromDirectory, type JobStore } from '@/server/jobs';
import { toJobQuestionnaire, toJobSummary, type Warn } from '@/server/normalize';
import { profileFromFile, type Profile } from '@/server/prefill';
import type { JobSummary } from '@/shared/questionnaire';

export interface AppDeps {
  jobs: JobStore;
  loadProfile: () => Promise<Profile>;
  warn: Warn;
}

/** The real sources: `jobs/`, `profile.json` and the console. */
const defaultDeps = (): AppDeps => ({
  jobs: jobsFromDirectory('jobs', (message) => console.warn(`jobs: ${message}`)),
  loadProfile: () => profileFromFile('profile.json'),
  warn: (message) => console.warn(`normalize: ${message}`),
});

/** The API. Each dependency defaults to the real one, so tests pass only the ones they fake. */
export function createApp(overrides: Partial<AppDeps> = {}) {
  const { jobs, loadProfile, warn } = { ...defaultDeps(), ...overrides };
  const app = new Hono();

  app.get('/api/jobs', async (c) => {
    // Of duplicate ids only the first is listed: it's the one `jobs.find` opens.
    const summaries = new Map<string, JobSummary>();
    for (const config of await jobs.list()) {
      const summary = toJobSummary(config);
      if (summary && !summaries.has(summary.id)) summaries.set(summary.id, summary);
    }
    return c.json([...summaries.values()]);
  });

  app.get('/api/jobs/:id/questionnaire', async (c) => {
    const id = c.req.param('id');
    const config = await jobs.find(id);
    if (config === undefined) return c.json({ error: 'not_found' }, 404);

    // Prefill is a convenience: without a readable profile the candidate still gets the questions.
    const profile = await loadProfile().catch((error: unknown) => {
      warn(
        `Prefilled nothing, the profile could not be read: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    });
    return c.json(toJobQuestionnaire(config, (message) => warn(`[${id}] ${message}`), profile));
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'internal' }, 500);
  });

  return app;
}
