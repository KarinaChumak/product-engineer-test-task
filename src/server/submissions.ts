import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ApplicationPayload } from '@/server/application';

// Stores submitted applications in one JSON file, keyed by candidate and job. Writes run one at a time,
// each to a temp file that then replaces the real one, so a crash never leaves a half-written file and two
// writes can't interleave.

export interface Submission {
  candidate_id: string;
  payload: ApplicationPayload;
}

export interface SubmissionStore {
  /** Stores the candidate's application for the payload's job. */
  save: (submission: Submission) => Promise<void>;
}

const submissionKey = ({ candidate_id, payload }: Submission) => `${candidate_id}:${payload.job_id}`;

export function submissionsFromFile(path: string): SubmissionStore {
  let queue: Promise<unknown> = Promise.resolve();
  /** Runs `task` after every task queued before it, whether those succeeded or not. */
  const runInTurn = (task: () => Promise<void>): Promise<void> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const readSubmissions = async (): Promise<Record<string, Submission>> => {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as Record<string, Submission>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw error;
    }
  };

  return {
    save: (submission) =>
      runInTurn(async () => {
        const submissions = await readSubmissions();
        submissions[submissionKey(submission)] = submission;
        await mkdir(dirname(path), { recursive: true });
        const temp = `${path}.${process.pid}.tmp`;
        await writeFile(temp, `${JSON.stringify(submissions, null, 2)}\n`);
        await rename(temp, path);
      }),
  };
}
