// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jobsFromDirectory } from '@/server/jobs';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'jobs-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true });
});

describe('jobsFromDirectory', () => {
  it('finds a job by the id inside its file', async () => {
    await writeFile(join(dir, 'short.json'), JSON.stringify({ id: 'job-short', title: 'Short' }));

    expect(await jobsFromDirectory(dir, () => {}).find('job-short')).toEqual({
      id: 'job-short',
      title: 'Short',
    });
  });

  it('skips a file that is not valid JSON, with a warning, and still finds the other jobs', async () => {
    const warnings: string[] = [];
    await writeFile(join(dir, 'broken.json'), '{ "id": "job-broken",');
    await writeFile(join(dir, 'short.json'), JSON.stringify({ id: 'job-short' }));

    const job = await jobsFromDirectory(dir, (message) => warnings.push(message)).find('job-short');

    expect(job).toEqual({ id: 'job-short' });
    expect(warnings).toEqual([expect.stringContaining('broken.json')]);
  });
});
