import type { AnswerValue } from '@/shared/questionnaire';

/** What the client sends to apply: the candidate's answers by question id. Empty answers are left out. */
export interface ApplicationRequest {
  answers: Record<string, AnswerValue>;
}
