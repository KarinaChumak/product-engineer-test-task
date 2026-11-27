import type { AnswerValue } from '@/shared/questionnaire';

/**
 * What the client sends to prequalify for a job: the candidate's answers by question id. Empty answers are
 * left out. It isn't an application: the answers reach the employer only if they pass the job's screening.
 */
export interface PrequalificationRequest {
  answers: Record<string, AnswerValue>;
}
