import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

export interface QuestionProps<Q extends ClientQuestion = ClientQuestion> {
  question: Q;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}
