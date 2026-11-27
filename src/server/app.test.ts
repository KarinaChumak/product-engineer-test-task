// @vitest-environment node
import { createApp, type AppDeps } from '@/server/app';
import type { JobStore } from '@/server/jobs';
import type { Submission } from '@/server/submissions';
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

  it('lists a duplicated job id once, as the first config with it, the one the questionnaire opens', async () => {
    const jobs = storeOf(
      { id: 'job-twice', title: 'First', company: 'Acme' },
      { id: 'job-twice', title: 'Second', company: 'Acme' },
    );

    const response = await createApp({ ...silent, jobs }).request('/api/jobs');

    expect(await response.json()).toEqual([{ id: 'job-twice', title: 'First', company: 'Acme' }]);
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

  it('returns job-short with salary_expectation prefilled from the profile amount', async () => {
    const response = await createApp(silent).request('/api/jobs/job-short/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'salary_expectation')).toMatchObject({
      type: 'numeric',
      prefill: 95000,
    });
  });

  it.each([
    ['outside the question range', 400000],
    ['not a whole number', 95000.5],
    ['not a number', '95000'],
  ])('does not prefill a salary amount that is %s', async (_, amount) => {
    const app = createApp({
      ...silent,
      loadProfile: async () => ({ salary_expectation: { amount } as { amount: number } }),
    });

    const response = await app.request('/api/jobs/job-short/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'salary_expectation')).not.toHaveProperty('prefill');
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

describe('POST /api/jobs/:id/prequalification', () => {
  /** An app whose stored submissions land in the returned array. */
  const appStoringIn = (overrides: Partial<AppDeps> = {}) => {
    const saved: Submission[] = [];
    const app = createApp({
      ...silent,
      submissions: { save: async (s) => void saved.push(s) },
      ...overrides,
    });
    return { app, saved };
  };

  const submitAnswers = (app: ReturnType<typeof createApp>, jobId: string, body: unknown) =>
    app.request(`/api/jobs/${jobId}/prequalification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const salaryJob = storeOf({
    id: 'job-salary',
    title: 'Salary',
    company: 'Acme',
    questions: [
      // Optional, so it can be left unanswered and fail its rule without failing validation.
      { type: 'numeric', id: 'salary', question: 'Salary?', max: 200000, must_be_below: 90000 },
      { type: 'text', id: 'note', question: 'Anything else?' },
    ],
  });

  const validShortAnswers = { answers: { notice_period: '3_months', salary_expectation: 95000 } };

  it('stores the contract payload for job-short under the candidate, leaving out an empty optional answer', async () => {
    const { app, saved } = appStoringIn();

    const response = await submitAnswers(app, 'job-short', validShortAnswers);

    expect(response.status).toBe(201);
    expect(saved).toEqual([
      {
        candidate_id: 'talent-4711',
        payload: {
          job_id: 'job-short',
          answers: [
            { id: 'notice_period', value: '3_months' },
            { id: 'salary_expectation', value: 95000 },
          ],
          screening: { passed: true, failed: [] },
        },
      },
    ]);
  });

  it.each([
    ['passes', 85000, { passed: true, failed: [] }],
    ['fails at the threshold', 90000, { passed: false, failed: ['salary'] }],
    ['fails above the threshold', 95000, { passed: false, failed: ['salary'] }],
  ])('stores a screening in which a salary below the rule %s', async (_, salary, screening) => {
    const { app, saved } = appStoringIn({ jobs: salaryJob });

    await submitAnswers(app, 'job-salary', { answers: { salary } });

    expect(saved[0]?.payload.screening).toEqual(screening);
  });

  it('fails the rule of a question left without an answer', async () => {
    const { app, saved } = appStoringIn({ jobs: salaryJob });

    await submitAnswers(app, 'job-salary', { answers: { note: 'Hi' } });

    expect(saved[0]?.payload).toMatchObject({
      answers: [{ id: 'note', value: 'Hi' }],
      screening: { passed: false, failed: ['salary'] },
    });
  });

  it('answers the same, without the screening or a threshold, whether the candidate passed or failed', async () => {
    const { app } = appStoringIn({ jobs: salaryJob });

    const passed = await submitAnswers(app, 'job-salary', { answers: { salary: 85000 } });
    const failed = await submitAnswers(app, 'job-salary', { answers: { salary: 95000 } });

    expect([passed.status, await passed.text()]).toEqual([201, '']);
    expect([failed.status, await failed.text()]).toEqual([201, '']);
  });

  it.each([
    ['blank', '   '],
    ['empty', ''],
  ])('leaves out an optional text answer that is %s', async (_, note) => {
    const { app, saved } = appStoringIn({ jobs: salaryJob });

    await submitAnswers(app, 'job-salary', { answers: { salary: 85000, note } });

    expect(saved[0]?.payload.answers).toEqual([{ id: 'salary', value: 85000 }]);
  });

  it('leaves out answers to questions the job does not ask', async () => {
    const { app, saved } = appStoringIn({ jobs: salaryJob });

    await submitAnswers(app, 'job-salary', { answers: { salary: 85000, made_up: 'x' } });

    expect(saved[0]?.payload.answers).toEqual([{ id: 'salary', value: 85000 }]);
  });

  it('stores a multi-choice answer as values', async () => {
    const jobs = storeOf({
      id: 'job-multi',
      questions: [
        {
          type: 'select',
          id: 'stack',
          question: 'Stack?',
          max_choices: 2,
          options: [
            { label: 'React', value: 'react' },
            { label: 'Vue', value: 'vue' },
          ],
        },
      ],
    });
    const { app, saved } = appStoringIn({ jobs });

    await submitAnswers(app, 'job-multi', { answers: { stack: ['react', 'vue'] } });

    expect(saved[0]?.payload.answers).toEqual([{ id: 'stack', values: ['react', 'vue'] }]);
  });

  it.each([
    ['has no id', async () => ({})],
    ['cannot be read', () => Promise.reject(new Error('ENOENT: profile.json'))],
  ])('returns 500 and stores nothing when the profile %s', async (_, loadProfile) => {
    const errors: unknown[] = [];
    const { app, saved } = appStoringIn({ loadProfile, logError: (error) => errors.push(error) });

    const response = await submitAnswers(app, 'job-short', validShortAnswers);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal' });
    expect(saved).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it('returns 422 with every refused answer by question id and stores nothing', async () => {
    const { app, saved } = appStoringIn();

    const response = await submitAnswers(app, 'job-short', {
      answers: { notice_period: 'never', salary_expectation: 10000, proud_project: 'x'.repeat(5001) },
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'invalid_answers',
      fields: {
        notice_period: 'not_an_option',
        salary_expectation: 'out_of_range',
        proud_project: 'too_long',
      },
    });
    expect(saved).toEqual([]);
  });

  it('returns 422 for a required question left blank', async () => {
    const { app, saved } = appStoringIn();

    const response = await submitAnswers(app, 'job-short', { answers: { notice_period: '  ' } });

    expect(await response.json()).toEqual({
      error: 'invalid_answers',
      fields: { notice_period: 'required', salary_expectation: 'required' },
    });
    expect(saved).toEqual([]);
  });

  it('refuses an invalid answer before reading the profile', async () => {
    const errors: unknown[] = [];
    const loadProfile = () => Promise.reject(new Error('ENOENT: profile.json'));
    const { app } = appStoringIn({ loadProfile, logError: (error) => errors.push(error) });

    const response = await submitAnswers(app, 'job-short', { answers: {} });

    expect(response.status).toBe(422);
    expect(errors).toEqual([]);
  });

  it('returns 404 for an unknown job and stores nothing', async () => {
    const { app, saved } = appStoringIn();

    const response = await submitAnswers(app, 'job-missing', { answers: {} });

    expect(response.status).toBe(404);
    expect(saved).toEqual([]);
  });

  it.each([
    ['no answers object', {}],
    ['an answer that is not a value', { answers: { salary_expectation: { amount: 1 } } }],
  ])('returns 400 for %s and stores nothing', async (_, body) => {
    const { app, saved } = appStoringIn();

    const response = await submitAnswers(app, 'job-short', body);

    expect(response.status).toBe(400);
    expect(saved).toEqual([]);
  });

  it('returns 400 for a body that is not JSON and stores nothing', async () => {
    const { app, saved } = appStoringIn();

    const response = await app.request('/api/jobs/job-short/prequalification', {
      method: 'POST',
      body: 'not json',
    });

    expect(response.status).toBe(400);
    expect(saved).toEqual([]);
  });
});
