import { Hono } from 'hono';
import { buildApplicationPayload, isApplicationRequest } from '@/server/application';
import { jobsFromDirectory, type JobStore } from '@/server/jobs';
import { parseJob, toJobQuestionnaire, toJobSummary, type Warn } from '@/server/normalize';
import { profileFromFile, type Profile } from '@/server/prefill';
import { submissionsFromFile, type SubmissionStore } from '@/server/submissions';
import type { JobSummary } from '@/shared/questionnaire';

export interface AppDeps {
  jobs: JobStore;
  loadProfile: () => Promise<Profile>;
  submissions: SubmissionStore;
  warn: Warn;
  /** Reports an error that ended a request with a 500. */
  logError: (error: unknown) => void;
}

/** The real sources: `jobs/`, `profile.json`, `data/submissions.json` and the console. */
const defaultDeps = (): AppDeps => ({
  jobs: jobsFromDirectory('jobs', (message) => console.warn(`jobs: ${message}`)),
  loadProfile: () => profileFromFile('profile.json'),
  submissions: submissionsFromFile('data/submissions.json'),
  warn: (message) => console.warn(`normalize: ${message}`),
  logError: (error) => console.error(error),
});

/** The API. Each dependency defaults to the real one, so tests pass only the ones they fake. */
export function createApp(overrides: Partial<AppDeps> = {}) {
  const { jobs, loadProfile, submissions, warn, logError } = { ...defaultDeps(), ...overrides };
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
    const job = parseJob(config, (message) => warn(`[${id}] ${message}`));
    return c.json(toJobQuestionnaire(job, profile));
  });

  app.post('/api/jobs/:id/applications', async (c) => {
    const id = c.req.param('id');
    const config = await jobs.find(id);
    if (config === undefined) return c.json({ error: 'not_found' }, 404);
    const body: unknown = await c.req.json().catch(() => undefined);
    if (!isApplicationRequest(body)) return c.json({ error: 'invalid_body' }, 400);

    // Unlike prefill, storing needs the candidate, so a profile that can't be read is a server error.
    const { id: candidateId } = await loadProfile();
    if (!candidateId) throw new Error('The profile has no id to store the application under');
    const job = parseJob(config, (message) => warn(`[${id}] ${message}`));
    await submissions.save({ candidate_id: candidateId, payload: buildApplicationPayload(job, body) });
    // The same empty answer whatever the screening result, so the candidate can't tell.
    return c.body(null, 201);
  });

  app.onError((error, c) => {
    logError(error);
    return c.json({ error: 'internal' }, 500);
  });

  return app;
}
