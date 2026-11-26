import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

export interface QuestionProps<Q extends ClientQuestion = ClientQuestion> {
  question: Q;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** True while the answer is still the one taken from the profile. */
  fromProfile: boolean;
}
