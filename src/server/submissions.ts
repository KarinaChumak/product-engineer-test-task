import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { PrequalificationPayload } from '@/server/prequalification';

// Stores submitted prequalification answers in one JSON file, keyed by candidate and job. Reads and writes
// run one at a time, each write to a temp file that then replaces the real one, so a crash never leaves a
// half-written file, two writes can't interleave, and a check followed by a write is atomic.

export interface Submission {
  candidate_id: string;
  payload: PrequalificationPayload;
}

export interface SubmissionStore {
  /** Whether the candidate has already submitted answers for the job. */
  has: (candidateId: string, jobId: string) => Promise<boolean>;
  /**
   * Stores the candidate's answers for the payload's job unless answers for that job are already stored,
   * and resolves with whether it stored them. The check and the write are one step, so of two requests
   * sent at once only one is stored.
   */
  saveIfNew: (submission: Submission) => Promise<boolean>;
}

const submissionKey = (candidateId: string, jobId: string) => `${candidateId}:${jobId}`;

export function submissionsFromFile(path: string): SubmissionStore {
  let queue: Promise<unknown> = Promise.resolve();
  /** Runs `task` after every task queued before it, whether those succeeded or not. */
  const runInTurn = <T>(task: () => Promise<T>): Promise<T> => {
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
    has: (candidateId, jobId) =>
      runInTurn(async () => Object.hasOwn(await readSubmissions(), submissionKey(candidateId, jobId))),
    saveIfNew: (submission) =>
      runInTurn(async () => {
        const submissions = await readSubmissions();
        const key = submissionKey(submission.candidate_id, submission.payload.job_id);
        if (Object.hasOwn(submissions, key)) return false;
        submissions[key] = submission;
        await mkdir(dirname(path), { recursive: true });
        const temp = `${path}.${process.pid}.tmp`;
        await writeFile(temp, `${JSON.stringify(submissions, null, 2)}\n`);
        await rename(temp, path);
        return true;
      }),
  };
}
