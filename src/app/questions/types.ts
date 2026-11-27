import type { ReactNode } from 'react';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

export interface QuestionProps<Q extends ClientQuestion = ClientQuestion> {
  question: Q;
  value: AnswerValue | undefined;
  /** Called with undefined when the candidate clears the answer. */
  onChange: (value: AnswerValue | undefined) => void;
  /** Called when the candidate leaves the question. */
  onBlur: () => void;
  /** True while the answer is still the one taken from the profile. */
  fromProfile: boolean;
  /**
   * Why the answer is refused, by the check the page runs on every change or by the server, once the field
   * should show it.
   */
  error?: ReactNode;
}
