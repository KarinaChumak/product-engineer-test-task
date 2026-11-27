import { Hono, type Context } from 'hono';
import { jobsFromDirectory, type JobStore } from '@/server/jobs';
import { parseJob, toJobQuestionnaire, toJobSummary, type Warn } from '@/server/normalize';
import { profileFromFile, type Profile } from '@/server/prefill';
import {
  buildPrequalificationPayload,
  collectJobAnswers,
  isPrequalificationRequest,
} from '@/server/prequalification';
import { screenAnswers } from '@/server/screening';
import { submissionsFromFile, type Submission, type SubmissionStore } from '@/server/submissions';
import { findInvalidAnswers } from '@/server/validation';
import type {
  AlreadyCompletedResponse,
  InvalidAnswersResponse,
  PrequalificationResult,
} from '@/shared/prequalification';
import type { JobSummary } from '@/shared/questionnaire';

export interface AppDeps {
  jobs: JobStore;
  loadProfile: () => Promise<Profile>;
  submissions: SubmissionStore;
  warn: Warn;
  /** Reports an error that ended a request with a 500. */
  logError: (error: unknown) => void;
  /** Reports a stored submission, the payload an employer integration would receive. */
  logSubmission: (submission: Submission) => void;
}

/** The real sources: `jobs/`, `profile.json`, `data/submissions.json` and the console. */
const defaultDeps = (): AppDeps => ({
  jobs: jobsFromDirectory('jobs', (message) => console.warn(`jobs: ${message}`)),
  loadProfile: () => profileFromFile('profile.json'),
  submissions: submissionsFromFile('data/submissions.json'),
  warn: (message) => console.warn(`normalize: ${message}`),
  logError: (error) => console.error(error),
  logSubmission: (submission) =>
    console.info(`prequalification: stored ${JSON.stringify(submission, null, 2)}`),
});

/** The 409 for a second prequalification of the same job. The stored one stays as it was. */
const alreadyCompleted = (c: Context) => {
  const message =
    'The candidate has already submitted answers for this job. The new answers were not screened or stored.';
  return c.json({ error: 'already_completed', message } satisfies AlreadyCompletedResponse, 409);
};

/** The API. Each dependency defaults to the real one, so tests pass only the ones they fake. */
export function createApp(overrides: Partial<AppDeps> = {}) {
  const { jobs, loadProfile, submissions, warn, logError, logSubmission } = {
    ...defaultDeps(),
    ...overrides,
  };
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
    const profile = await loadProfile().catch((error: unknown): Profile => {
      warn(
        `Prefilled nothing, the profile could not be read: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    });
    const job = parseJob(config, (message) => warn(`[${id}] ${message}`));
    // Without a candidate id nothing can have been stored under it, and the POST would refuse to store it.
    // Unlike the profile, a submissions file that can't be read is a 500: the answers couldn't be stored
    // either, so the page shows its retry error instead of a form that can't be sent.
    const isCompleted = profile.id ? await submissions.has(profile.id, job.id) : false;
    return c.json(toJobQuestionnaire(job, profile, isCompleted));
  });

  // Prequalification, not an application: the answers reach the employer only if they pass screening.
  app.post('/api/jobs/:id/prequalification', async (c) => {
    const id = c.req.param('id');
    const config = await jobs.find(id);
    if (config === undefined) return c.json({ error: 'not_found' }, 404);
    const body: unknown = await c.req.json().catch(() => undefined);
    if (!isPrequalificationRequest(body)) {
      const message =
        'The request body must be { "answers": { "<question id>": <value> } }. The answers were not screened or stored.';
      return c.json({ error: 'invalid_body', message }, 400);
    }

    // 1. Check the answers against the questions the candidate saw. Screening never runs on invalid input.
    const job = parseJob(config, (message) => warn(`[${id}] ${message}`));
    const fields = findInvalidAnswers(job, body);
    if (Object.keys(fields).length > 0) {
      const message =
        'Some answers are not valid for their questions. The answers were not screened or stored.';
      return c.json({ error: 'invalid_answers', message, fields } satisfies InvalidAnswersResponse, 422);
    }

    // 2. Screen them: this decides whether the answers go on to the employer.
    const answers = collectJobAnswers(job, body);
    const screening = screenAnswers(job, answers);

    // 3. Store them under the candidate, once per job: a second submission could probe a screening threshold,
    // so it gets a 409 and the stored one stays. Unlike prefill, this needs the candidate, so a profile that
    // can't be read is a server error.
    const { id: candidateId } = await loadProfile();
    if (!candidateId) throw new Error('The profile has no id to store the answers under');
    const submission = {
      candidate_id: candidateId,
      payload: buildPrequalificationPayload(job.id, answers, screening),
    };
    if (!(await submissions.saveIfNew(submission))) return alreadyCompleted(c);
    // Integration point: this is where the payload would go to the employer's system, when screening passed.
    // Until there is one, it's stored and logged.
    logSubmission(submission);

    // The candidate learns whether they passed, never which question failed: that would point at a threshold.
    return c.json({ passed: screening.passed } satisfies PrequalificationResult, 201);
  });

  app.onError((error, c) => {
    logError(error);
    return c.json({ error: 'internal' }, 500);
  });

  return app;
}
