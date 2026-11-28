// @vitest-environment node
import { createApp, type AppDeps } from '@/server/app';
import type { JobStore } from '@/server/jobs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { submissionsFromFile, type Submission, type SubmissionStore } from '@/server/submissions';
import type { JobQuestionnaire } from '@/shared/questionnaire';

/** A store that keeps its submissions in `saved`, one per candidate and job, like the real one. */
const submissionsIn = (saved: Submission[]): SubmissionStore => {
  const has = async (candidateId: string, jobId: string) =>
    saved.some((s) => s.candidate_id === candidateId && s.payload.job_id === jobId);
  return {
    has,
    saveIfNew: async (submission) => {
      if (await has(submission.candidate_id, submission.payload.job_id)) return false;
      saved.push(submission);
      return true;
    },
  };
};

// Everything else comes from the real `jobs/` and `profile.json`, but never the real `data/submissions.json`.
// Normalization warnings are expected.
const silent = {
  warn: () => {},
  logSubmission: () => {},
  submissions: submissionsIn([]),
  today: () => '2026-06-15',
};

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

  it('returns job-long with german_level prefilled from the profile languages and years_of_experience from the profile', async () => {
    const response = await createApp(silent).request('/api/jobs/job-long/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'german_level')).toMatchObject({
      type: 'select',
      prefill: 'B1',
    });
    expect(job.questions.find((q) => q.id === 'years_of_experience')).toMatchObject({
      type: 'numeric',
      prefill: 6,
    });
  });

  it('returns job-long with its starting_date as a required date question from today on', async () => {
    const response = await createApp(silent).request('/api/jobs/job-long/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'starting_date')).toEqual({
      type: 'date',
      id: 'starting_date',
      question: 'Ab wann könnten Sie bei uns starten?',
      required: true,
      min: '2026-06-15',
    });
  });

  it('resolves "today" on each request, so a server running past midnight moves the range', async () => {
    let date = '2026-06-15';
    const app = createApp({ ...silent, today: () => date });
    const minOf = async () => {
      const response = await app.request('/api/jobs/job-long/questionnaire');
      const job = (await response.json()) as JobQuestionnaire;
      return job.questions.find((q) => q.id === 'starting_date');
    };

    expect(await minOf()).toMatchObject({ min: '2026-06-15' });
    date = '2026-06-16';
    expect(await minOf()).toMatchObject({ min: '2026-06-16' });
  });

  it('refuses a start date before today with a 422', async () => {
    const app = createApp({ ...silent, today: () => '2026-06-15' });
    const response = await app.request('/api/jobs/job-long/prequalification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: { starting_date: '2026-06-14' } }),
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ fields: { starting_date: 'out_of_range' } });
  });

  const levels = [
    { label: 'B1', value: 'B1' },
    { label: 'C1', value: 'C1' },
  ];
  const jobWithEveryProfileField = storeOf({
    id: 'job-profile',
    questions: [
      { type: 'select', id: 'german', question: 'German?', profile_field: 'german_level', options: levels },
      {
        type: 'select',
        id: 'english',
        question: 'English?',
        profile_field: 'english_level',
        options: levels,
      },
      { type: 'text', id: 'city', question: 'City?', profile_field: 'city' },
      {
        type: 'numeric',
        id: 'years',
        question: 'Years?',
        min: 0,
        max: 50,
        profile_field: 'years_of_experience',
      },
    ],
  });
  const prefillsOf = async (loadProfile: AppDeps['loadProfile']) => {
    const app = createApp({ ...silent, jobs: jobWithEveryProfileField, loadProfile });
    const response = await app.request('/api/jobs/job-profile/questionnaire');
    const job = (await response.json()) as JobQuestionnaire;
    return Object.fromEntries(job.questions.map((q) => [q.id, q.prefill]));
  };

  it('prefills english_level and city from the profile, as the README maps them', async () => {
    expect(
      await prefillsOf(async () => ({
        languages: [{ language: 'en', level: 'C1' }],
        location: { city: 'Berlin' },
      })),
    ).toMatchObject({ english: 'C1', city: 'Berlin' });
  });

  it.each([
    ['a language level that is not an option', { languages: [{ language: 'de', level: 'native' }] }],
    ['years of experience out of range', { years_of_experience: 60 }],
    ['languages that are not a list', { languages: 'de' as never }],
    ['a profile without those fields', {}],
  ])('does not prefill %s', async (_, profile) => {
    expect(await prefillsOf(async () => profile)).toEqual({
      german: undefined,
      english: undefined,
      city: undefined,
      years: undefined,
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

  it('does not prefill a multi-choice question, whose answer is a list, from a single profile value', async () => {
    const jobs = storeOf({
      id: 'job-multi',
      questions: [
        {
          type: 'select',
          id: 'notice',
          question: 'Notice?',
          max_choices: 2,
          profile_field: 'notice_period',
          options: [{ label: '3 months', value: '3_months' }],
        },
      ],
    });
    const app = createApp({ ...silent, jobs, loadProfile: async () => ({ notice_period: '3_months' }) });

    const response = await app.request('/api/jobs/job-multi/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions[0]).not.toHaveProperty('prefill');
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

  it('says the job is not completed before the candidate submits, and completed after', async () => {
    const app = createApp({ ...silent, submissions: submissionsIn([]) });
    const isCompleted = async () =>
      ((await (await app.request('/api/jobs/job-short/questionnaire')).json()) as JobQuestionnaire)
        .isCompleted;

    const before = await isCompleted();
    await app.request('/api/jobs/job-short/prequalification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { notice_period: '3_months', salary_expectation: 95000 } }),
    });

    expect([before, await isCompleted()]).toEqual([false, true]);
  });

  it('says the job is completed only for the candidate who submitted', async () => {
    const saved: Submission[] = [];
    const submissions = submissionsIn(saved);
    await submissions.saveIfNew({
      candidate_id: 'talent-0001',
      payload: { job_id: 'job-short', answers: [], screening: { passed: true, failed: [] } },
    });

    const response = await createApp({ ...silent, submissions }).request('/api/jobs/job-short/questionnaire');

    expect(((await response.json()) as JobQuestionnaire).isCompleted).toBe(false);
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
      submissions: submissionsIn(saved),
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

  it('logs the stored submission, the payload an employer integration would receive', async () => {
    const logged: Submission[] = [];
    const { app, saved } = appStoringIn({ logSubmission: (submission) => logged.push(submission) });

    await submitAnswers(app, 'job-short', validShortAnswers);

    expect(logged).toEqual(saved);
  });

  it('refuses a second submission for the same job with a 409 that says nothing about the result, keeping the first', async () => {
    const logged: Submission[] = [];
    const { app, saved } = appStoringIn({ logSubmission: (submission) => logged.push(submission) });
    await submitAnswers(app, 'job-short', validShortAnswers);
    const [first] = saved;

    const response = await submitAnswers(app, 'job-short', {
      answers: { notice_period: 'immediately', salary_expectation: 60000 },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'already_completed',
      message:
        'The candidate has already submitted answers for this job. The new answers were not screened or stored.',
    });
    expect(saved).toEqual([first]);
    expect(logged).toEqual([first]);
  });

  it('stores only one of two submissions for the same job sent at once, to the real file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'submissions-'));
    try {
      const path = join(directory, 'submissions.json');
      const app = createApp({ ...silent, submissions: submissionsFromFile(path) });

      const salaries = [validShortAnswers.answers.salary_expectation, 60000];
      const statuses = (
        await Promise.all([
          submitAnswers(app, 'job-short', validShortAnswers),
          submitAnswers(app, 'job-short', {
            answers: { notice_period: 'immediately', salary_expectation: salaries[1] },
          }),
        ])
      ).map((response) => response.status);

      // Either request can reach the store first; exactly one wins, and its answers are the ones kept.
      expect([...statuses].sort()).toEqual([201, 409]);
      const stored = JSON.parse(await readFile(path, 'utf8')) as Record<string, Submission>;
      expect(Object.keys(stored)).toEqual(['talent-4711:job-short']);
      expect(stored['talent-4711:job-short']?.payload.answers).toContainEqual({
        id: 'salary_expectation',
        value: salaries[statuses.indexOf(201)],
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('logs nothing when the answers are refused', async () => {
    const logged: Submission[] = [];
    const { app } = appStoringIn({ logSubmission: (submission) => logged.push(submission) });

    await submitAnswers(app, 'job-short', { answers: {} });

    expect(logged).toEqual([]);
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

  it('tells the candidate whether they passed, and nothing about which rule or threshold', async () => {
    const passed = await submitAnswers(appStoringIn({ jobs: salaryJob }).app, 'job-salary', {
      answers: { salary: 85000 },
    });
    const failed = await submitAnswers(appStoringIn({ jobs: salaryJob }).app, 'job-salary', {
      answers: { salary: 95000 },
    });

    expect([passed.status, await passed.json()]).toEqual([201, { passed: true }]);
    expect([failed.status, await failed.json()]).toEqual([201, { passed: false }]);
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

  it('stores a yes/no answer as a JSON boolean, and screens false against must_be_true', async () => {
    const jobs = storeOf({
      id: 'job-permit',
      questions: [
        { type: 'boolean', id: 'permit', question: 'EU permit?', required: true, must_be_true: true },
        { type: 'boolean', id: 'relocate', question: 'Relocate?' },
      ],
    });
    const { app, saved } = appStoringIn({ jobs });

    const response = await submitAnswers(app, 'job-permit', { answers: { permit: false, relocate: true } });

    expect([response.status, await response.json()]).toEqual([201, { passed: false }]);
    expect(saved[0]?.payload).toEqual({
      job_id: 'job-permit',
      answers: [
        { id: 'permit', value: false },
        { id: 'relocate', value: true },
      ],
      screening: { passed: false, failed: ['permit'] },
    });
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

  const startDateJob = storeOf({
    id: 'job-start',
    questions: [{ type: 'date', id: 'start', question: 'Start?', required: true }],
  });

  it('stores a date answer as its YYYY-MM-DD string', async () => {
    const { app, saved } = appStoringIn({ jobs: startDateJob });

    await submitAnswers(app, 'job-start', { answers: { start: '2027-01-15' } });

    expect(saved[0]?.payload.answers).toEqual([{ id: 'start', value: '2027-01-15' }]);
  });

  it('refuses a date that is not in the calendar with not_a_date', async () => {
    const { app, saved } = appStoringIn({ jobs: startDateJob });

    const response = await submitAnswers(app, 'job-start', { answers: { start: '2027-02-30' } });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ fields: { start: 'not_a_date' } });
    expect(saved).toEqual([]);
  });

  const coverLetterJob = storeOf({
    id: 'job-file',
    title: 'File',
    company: 'Acme',
    questions: [{ type: 'file', id: 'cover_letter', question: 'Cover letter?', required: true }],
  });

  /** A file answer whose base64 `data` is `characters` long. */
  const fileAnswer = (characters: number) => ({
    content_type: 'application/pdf',
    data: 'A'.repeat(characters),
    file_name: 'cover_letter.pdf',
  });

  it('stores a file answer as the file object, with its base64 data', async () => {
    const { app, saved } = appStoringIn({ jobs: coverLetterJob });
    const answer = fileAnswer(100);

    const response = await submitAnswers(app, 'job-file', { answers: { cover_letter: answer } });

    expect(response.status).toBe(201);
    expect(saved[0]?.payload.answers).toEqual([{ id: 'cover_letter', value: answer }]);
  });

  it('refuses a file answer that is not a file object with wrong_type', async () => {
    const { app, saved } = appStoringIn({ jobs: coverLetterJob });

    const response = await submitAnswers(app, 'job-file', { answers: { cover_letter: 'cover_letter.pdf' } });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ fields: { cover_letter: 'wrong_type' } });
    expect(saved).toEqual([]);
  });

  it('accepts a body big enough for a 5 MB file encoded as base64', async () => {
    const { app, saved } = appStoringIn({ jobs: coverLetterJob });
    const base64Characters = Math.ceil((5 * 1024 * 1024) / 3) * 4;

    const response = await submitAnswers(app, 'job-file', {
      answers: { cover_letter: fileAnswer(base64Characters) },
    });

    expect(response.status).toBe(201);
    expect(saved).toHaveLength(1);
  });

  it('refuses a body bigger than that with 413 and stores nothing', async () => {
    const { app, saved } = appStoringIn({ jobs: coverLetterJob });

    const response = await submitAnswers(app, 'job-file', {
      answers: { cover_letter: fileAnswer(8 * 1024 * 1024) },
    });

    expect(response.status).toBe(413);
    expect(saved).toEqual([]);
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
      message: 'Some answers are not valid for their questions. The answers were not screened or stored.',
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

    expect(await response.json()).toMatchObject({
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
    expect(await response.json()).toEqual({
      error: 'invalid_body',
      message:
        'The request body must be { "answers": { "<question id>": <value> } }. The answers were not screened or stored.',
    });
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
