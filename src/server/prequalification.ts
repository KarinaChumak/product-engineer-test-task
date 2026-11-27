import { isRecord, type Job } from '@/server/normalize';
import { screenAnswers, type Screening } from '@/server/screening';
import { isEmptyAnswer } from '@/server/validation';
import type { PrequalificationRequest } from '@/shared/prequalification';
import type { AnswerValue } from '@/shared/questionnaire';

// Builds the README contract's answer payload from a candidate's prequalification answers. Server-only: it
// holds the screening result, which decides whether the answers go to the employer and never goes back to
// the client.

/** A multi-select answer uses `values`; every other answer uses `value`. */
export type PayloadAnswer =
  { id: string; value: Exclude<AnswerValue, string[]> } | { id: string; values: string[] };

export interface PrequalificationPayload {
  job_id: string;
  answers: PayloadAnswer[];
  screening: Screening;
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

/**
 * The payload for the job's questions, in their order, with the screening result. Answers to questions the
 * job doesn't ask are left out, and so are questions without an answer, or with an empty one. Check the
 * answers with `findAnswerErrors` first: this stores what it's given.
 */
export function buildPrequalificationPayload(
  job: Job,
  request: PrequalificationRequest,
): PrequalificationPayload {
  const answers = new Map<string, AnswerValue>();
  for (const { client } of job.questions) {
    const value = Object.hasOwn(request.answers, client.id) ? request.answers[client.id] : undefined;
    if (value !== undefined && !isEmptyAnswer(value)) answers.set(client.id, value);
  }
  return {
    job_id: job.id,
    answers: [...answers].map(([id, value]) =>
      Array.isArray(value) ? { id, values: value } : { id, value },
    ),
    screening: screenAnswers(job, answers),
  };
}
