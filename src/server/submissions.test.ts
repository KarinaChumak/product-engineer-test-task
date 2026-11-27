// @vitest-environment node
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { submissionsFromFile, type Submission } from '@/server/submissions';

const submissionFor = (jobId: string, salary: number): Submission => ({
  candidate_id: 'talent-4711',
  payload: {
    job_id: jobId,
    answers: [{ id: 'salary', value: salary }],
    screening: { passed: true, failed: [] },
  },
});

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'submissions-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const readStored = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as unknown;

describe('submissionsFromFile', () => {
  it('creates the file and its folder, keyed by candidate and job', async () => {
    const path = join(directory, 'data', 'submissions.json');

    expect(await submissionsFromFile(path).saveIfNew(submissionFor('job-short', 95000))).toBe(true);

    expect(await readStored(path)).toEqual({ 'talent-4711:job-short': submissionFor('job-short', 95000) });
  });

  it('keeps every submission when several are saved at once, and leaves no temp file', async () => {
    const path = join(directory, 'submissions.json');
    const store = submissionsFromFile(path);

    await Promise.all(['job-a', 'job-b', 'job-c'].map((jobId) => store.saveIfNew(submissionFor(jobId, 1))));

    expect(Object.keys((await readStored(path)) as object).sort()).toEqual([
      'talent-4711:job-a',
      'talent-4711:job-b',
      'talent-4711:job-c',
    ]);
    expect(await readdir(directory)).toEqual(['submissions.json']);
  });

  it('refuses a second submission for the same candidate and job, keeping the first', async () => {
    const path = join(directory, 'submissions.json');
    const store = submissionsFromFile(path);
    await store.saveIfNew(submissionFor('job-short', 95000));

    expect(await store.saveIfNew(submissionFor('job-short', 50000))).toBe(false);

    expect(await readStored(path)).toEqual({ 'talent-4711:job-short': submissionFor('job-short', 95000) });
  });

  it('stores only one of two submissions for the same job sent at once', async () => {
    const path = join(directory, 'submissions.json');
    const store = submissionsFromFile(path);

    const results = await Promise.all([
      store.saveIfNew(submissionFor('job-short', 95000)),
      store.saveIfNew(submissionFor('job-short', 50000)),
    ]);

    expect(results).toEqual([true, false]);
    expect(await readStored(path)).toEqual({ 'talent-4711:job-short': submissionFor('job-short', 95000) });
  });

  it('says whether the candidate has submitted for a job', async () => {
    const store = submissionsFromFile(join(directory, 'submissions.json'));
    await store.saveIfNew(submissionFor('job-short', 95000));

    expect(await store.has('talent-4711', 'job-short')).toBe(true);
    expect(await store.has('talent-4711', 'job-long')).toBe(false);
    expect(await store.has('talent-0001', 'job-short')).toBe(false);
  });
});
