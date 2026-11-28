import type { ComponentType } from 'react';
import { BooleanQuestion } from '@/app/questions/BooleanQuestion';
import { NumericQuestion } from '@/app/questions/NumericQuestion';
import { SelectQuestion } from '@/app/questions/SelectQuestion';
import { TextQuestion } from '@/app/questions/TextQuestion';
import type { QuestionProps } from '@/app/questions/types';
import type { ClientQuestion, QuestionType } from '@/shared/questionnaire';

type QuestionComponents = {
  [T in QuestionType]?: ComponentType<QuestionProps<Extract<ClientQuestion, { type: T }>>>;
};

/** One entry per question type. Each later type adds its adapter here. */
const questionComponents: QuestionComponents = {
  select: SelectQuestion,
  numeric: NumericQuestion,
  text: TextQuestion,
  boolean: BooleanQuestion,
};

/** The component that renders this question, or undefined while its type isn't supported yet. */
export function getQuestionComponent(question: ClientQuestion): ComponentType<QuestionProps> | undefined {
  // The map pairs each type with the component for that type, which TypeScript can't follow through the lookup.
  return questionComponents[question.type] as ComponentType<QuestionProps> | undefined;
}
