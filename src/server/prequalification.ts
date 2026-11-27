import { isRecord, type Job } from '@/server/normalize';
import type { PrequalificationRequest } from '@/shared/prequalification';
import type { AnswerValue } from '@/shared/questionnaire';

// Builds the README contract's answer payload from a candidate's prequalification answers. Server-only:
// T-04's PR 2 adds the screening result to it, which decides whether the answers go to the employer and
// never goes back to the client.

/** A multi-select answer uses `values`; every other answer uses `value`. */
export type PayloadAnswer =
  { id: string; value: Exclude<AnswerValue, string[]> } | { id: string; values: string[] };

export interface PrequalificationPayload {
  job_id: string;
  answers: PayloadAnswer[];
}

const isAnswerValue = (value: unknown): value is AnswerValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'));

/** Whether a request body has the shape of a `PrequalificationRequest`. */
export function isPrequalificationRequest(body: unknown): body is PrequalificationRequest {
  return isRecord(body) && isRecord(body.answers) && Object.values(body.answers).every(isAnswerValue);
}

/** Whether a sent value says nothing: blank text or no choices. */
const isEmptyAnswer = (value: AnswerValue): boolean =>
  (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);

/**
 * The payload for the job's questions, in their order. Answers to questions the job doesn't ask are left
 * out, and so are questions without an answer, or with an empty one.
 */
export function buildPrequalificationPayload(
  job: Job,
  request: PrequalificationRequest,
): PrequalificationPayload {
  const answers = job.questions.flatMap(({ client: { id } }): PayloadAnswer[] => {
    const value = Object.hasOwn(request.answers, id) ? request.answers[id] : undefined;
    if (value === undefined || isEmptyAnswer(value)) return [];
    return [Array.isArray(value) ? { id, values: value } : { id, value }];
  });
  return { job_id: job.id, answers };
}
