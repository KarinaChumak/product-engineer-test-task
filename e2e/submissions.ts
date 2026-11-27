import { readFile, writeFile } from 'node:fs/promises';

// The dev server stores submissions in this file, and a job with one can't be answered again. Specs that
// answer a job clear its submission first, so reruns start from the form. `.claude/scripts/e2e` runs one
// spec at a time, so a spec never clears or completes a job while another one is on it.
const submissionsPath = 'data/submissions.json';
const candidateId = 'talent-4711';

/** Removes the candidate's stored submission for the job, so the job shows its questions again. */
export async function clearSubmission(jobId: string) {
  let submissions: Record<string, unknown>;
  try {
    submissions = JSON.parse(await readFile(submissionsPath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  const key = `${candidateId}:${jobId}`;
  if (!Object.hasOwn(submissions, key)) return;
  delete submissions[key];
  await writeFile(submissionsPath, `${JSON.stringify(submissions, null, 2)}\n`);
}
