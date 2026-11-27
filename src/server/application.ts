import type { Job } from '@/server/normalize';
import { screenAnswers, type Screening } from '@/server/screening';
import type { ApplicationRequest } from '@/shared/application';
import type { AnswerValue } from '@/shared/questionnaire';

// Builds the README contract's answer payload from what the candidate sent. Server-only: it holds the
// screening result, which never goes back to the client.

/** A multi-select answer uses `values`; every other answer uses `value`. */
export type PayloadAnswer =
  { id: string; value: string | number | boolean } | { id: string; values: string[] };

export interface ApplicationPayload {
  job_id: string;
  answers: PayloadAnswer[];
  screening: Screening;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAnswerValue = (value: unknown): value is AnswerValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'));

/** Whether a request body has the shape of an `ApplicationRequest`. */
export function isApplicationRequest(body: unknown): body is ApplicationRequest {
  return isRecord(body) && isRecord(body.answers) && Object.values(body.answers).every(isAnswerValue);
}

/**
 * The payload for the job's questions, in their order, with the screening result. Answers to questions the
 * job doesn't ask are left out, and so are questions without an answer.
 */
export function buildApplicationPayload(job: Job, request: ApplicationRequest): ApplicationPayload {
  const answers = new Map<string, AnswerValue>();
  for (const { client } of job.questions) {
    const value = Object.hasOwn(request.answers, client.id) ? request.answers[client.id] : undefined;
    if (value !== undefined) answers.set(client.id, value);
  }
  return {
    job_id: job.id,
    answers: [...answers].map(([id, value]) =>
      Array.isArray(value) ? { id, values: value } : { id, value },
    ),
    screening: screenAnswers(job, answers),
  };
}
