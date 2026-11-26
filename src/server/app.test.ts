// @vitest-environment node
import { createApp } from '@/server/app';
import type { JobStore } from '@/server/jobs';
import type { JobQuestionnaire } from '@/shared/questionnaire';

// Everything else comes from the real `jobs/` and `profile.json`. Normalization warnings are expected.
const silent = { warn: () => {} };

/** A store holding just these configs. */
const storeOf = (...configs: Record<string, unknown>[]): JobStore => ({
  find: async (id) => configs.find((config) => config.id === id),
  list: async () => configs,
});

describe('GET /api/jobs', () => {
  it('lists every job in the jobs directory by id, title and company, and nothing else', async () => {
    const response = await createApp(silent).request('/api/jobs');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 'job-bad', title: 'Senior Frontend Developer (m/w/d)', company: 'Muster Consulting AG' },
      { id: 'job-long', title: 'Senior Frontend Engineer', company: 'Nordlicht Software GmbH' },
      { id: 'job-short', title: 'Frontend Developer (React)', company: 'Kranich Health GmbH' },
    ]);
  });

  it('leaves out a config without an id, and titles a job without a title by its id', async () => {
    const jobs: JobStore = {
      find: async () => undefined,
      list: async () => [{ title: 'No id' }, { id: 'job-untitled', company: 'Acme' }, 'not an object'],
    };

    const response = await createApp({ ...silent, jobs }).request('/api/jobs');

    expect(await response.json()).toEqual([{ id: 'job-untitled', title: 'job-untitled', company: 'Acme' }]);
  });
});

describe('GET /api/jobs/:id/questionnaire', () => {
  it('returns job-short with notice_period prefilled from the profile', async () => {
    const response = await createApp(silent).request('/api/jobs/job-short/questionnaire');

    expect(response.status).toBe(200);
    const job = (await response.json()) as JobQuestionnaire;
    expect(job).toMatchObject({ id: 'job-short', title: 'Frontend Developer (React)', language: 'en' });
    expect(job.questions.find((q) => q.id === 'notice_period')).toMatchObject({
      type: 'select',
      required: true,
      prefill: '3_months',
    });
  });

  it('removes every screening rule from the job', async () => {
    const jobs = storeOf({
      id: 'job-rules',
      title: 'Rules',
      company: 'Acme',
      language: 'en',
      questions: [
        {
          type: 'select',
          id: 'notice',
          question: 'Notice?',
          must_be_below: 90000,
          must_be_true: true,
          options: [],
        },
      ],
    });

    const response = await createApp({ ...silent, jobs }).request('/api/jobs/job-rules/questionnaire');

    expect(await response.text()).not.toMatch(/must_be|90000/);
  });

  it('does not prefill a profile value that is not one of the options', async () => {
    const app = createApp({ ...silent, loadProfile: async () => ({ notice_period: 'never' }) });

    const response = await app.request('/api/jobs/job-short/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'notice_period')).not.toHaveProperty('prefill');
  });

  it('still returns the questionnaire, without prefill, when the profile cannot be read', async () => {
    const warnings: string[] = [];
    const app = createApp({
      loadProfile: () => Promise.reject(new Error('ENOENT: profile.json')),
      warn: (message) => warnings.push(message),
    });

    const response = await app.request('/api/jobs/job-short/questionnaire');

    expect(response.status).toBe(200);
    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'notice_period')).not.toHaveProperty('prefill');
    expect(warnings).toEqual([expect.stringContaining('ENOENT')]);
  });

  it('returns 404 for an unknown job', async () => {
    const response = await createApp(silent).request('/api/jobs/job-missing/questionnaire');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });
});
