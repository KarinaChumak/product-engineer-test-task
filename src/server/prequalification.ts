import { isRecord, type Job } from '@/server/normalize';
import type { Screening } from '@/server/screening';
import { getSentAnswer, isFileAnswer } from '@/shared/answerValidation';
import type { PrequalificationRequest } from '@/shared/prequalification';
import type { AnswerValue } from '@/shared/questionnaire';

// The request a candidate's prequalification answers arrive in, and the README contract's payload they're
// stored as. Server-only: the payload holds the screening result, which never goes back to the client.

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
  (Array.isArray(value) && value.every((item) => typeof item === 'string')) ||
  isFileAnswer(value);

/** Whether a request body has the shape of a `PrequalificationRequest`. */
export function isPrequalificationRequest(body: unknown): body is PrequalificationRequest {
  return isRecord(body) && isRecord(body.answers) && Object.values(body.answers).every(isAnswerValue);
}

/**
 * The answers to the job's questions by id, in the job's order. Answers to questions the job doesn't ask are
 * left out, and so are questions without an answer, or with an empty one. Check the answers with
 * `findInvalidAnswers` first: this keeps what it's given.
 */
export function collectJobAnswers(job: Job, request: PrequalificationRequest): Map<string, AnswerValue> {
  const answers = new Map<string, AnswerValue>();
  for (const { client: question } of job.questions) {
    const value = getSentAnswer(request, question.id);
    if (value !== undefined) answers.set(question.id, value);
  }
  return answers;
}

/** The README contract's payload: the collected answers, in their order, and the screening result. */
export function buildPrequalificationPayload(
  jobId: string,
  answers: ReadonlyMap<string, AnswerValue>,
  screening: Screening,
): PrequalificationPayload {
  return {
    job_id: jobId,
    answers: [...answers].map(([id, value]) =>
      Array.isArray(value) ? { id, values: value } : { id, value },
    ),
    screening,
  };
}
