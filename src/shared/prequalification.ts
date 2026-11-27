import type { AnswerValue } from '@/shared/questionnaire';

/**
 * What the client sends to prequalify for a job: the candidate's answers by question id. Empty answers are
 * left out. It isn't an application: the answers reach the employer only if they pass the job's screening.
 */
export interface PrequalificationRequest {
  answers: Record<string, AnswerValue>;
}

/** The longest text answer the server stores, in characters. */
export const maxTextAnswerLength = 5000;

/**
 * Why the server refused an answer. Each says what's wrong with the input only: a screening rule never
 * makes an answer invalid, so none of them can reveal a threshold.
 */
export type AnswerError =
  | 'required'
  | 'wrong_type'
  | 'not_an_option'
  | 'repeated_choice'
  | 'too_many_choices'
  | 'not_an_integer'
  | 'out_of_range'
  | 'too_long';

/** The body of a 422: the refused answers by question id. */
export interface InvalidAnswersResponse {
  error: 'invalid_answers';
  /** For whoever reads the response, not for the candidate: the client shows its own copy. */
  message: string;
  fields: Record<string, AnswerError>;
}
