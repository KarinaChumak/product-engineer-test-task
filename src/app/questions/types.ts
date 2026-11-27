import type { ReactNode } from 'react';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

export interface QuestionProps<Q extends ClientQuestion = ClientQuestion> {
  question: Q;
  value: AnswerValue | undefined;
  /** Called with undefined when the candidate clears the answer. */
  onChange: (value: AnswerValue | undefined) => void;
  /** True while the answer is still the one taken from the profile. */
  fromProfile: boolean;
  /** Why the answer was refused, by the check before sending or by the server, for the field to show. */
  error?: ReactNode;
}
