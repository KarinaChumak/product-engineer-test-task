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

    await submissionsFromFile(path).save(submissionFor('job-short', 95000));

    expect(await readStored(path)).toEqual({ 'talent-4711:job-short': submissionFor('job-short', 95000) });
  });

  it('keeps every submission when several are saved at once, and leaves no temp file', async () => {
    const path = join(directory, 'submissions.json');
    const store = submissionsFromFile(path);

    await Promise.all(['job-a', 'job-b', 'job-c'].map((jobId) => store.save(submissionFor(jobId, 1))));

    expect(Object.keys((await readStored(path)) as object).sort()).toEqual([
      'talent-4711:job-a',
      'talent-4711:job-b',
      'talent-4711:job-c',
    ]);
    expect(await readdir(directory)).toEqual(['submissions.json']);
  });
});
