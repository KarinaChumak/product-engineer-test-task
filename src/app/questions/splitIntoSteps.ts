import type { ClientQuestion, QuestionType } from '@/shared/questionnaire';

/** The steps a questionnaire is answered in, in the order they're shown. */
export type QuestionStepName = 'fromProfile' | 'quickAnswers' | 'ownWords';

export interface QuestionStep {
  name: QuestionStepName;
  questions: ClientQuestion[];
}

const stepNameByType: Record<QuestionType, Exclude<QuestionStepName, 'fromProfile'>> = {
  select: 'quickAnswers',
  boolean: 'quickAnswers',
  numeric: 'quickAnswers',
  date: 'quickAnswers',
  text: 'ownWords',
  file: 'ownWords',
};

const stepOrder: QuestionStepName[] = ['fromProfile', 'quickAnswers', 'ownWords'];

/**
 * Splits the questions into the steps of "Phase 3: Questions are split into three steps": every prefilled
 * question first, whatever its type, then the quick answers, then the ones in the candidate's own words. Each
 * step keeps the questions' order, and a step with no questions is left out.
 */
export function splitIntoSteps(questions: ClientQuestion[]): QuestionStep[] {
  const getStepName = (question: ClientQuestion): QuestionStepName =>
    question.prefill === undefined ? stepNameByType[question.type] : 'fromProfile';
  return stepOrder.flatMap((name) => {
    const stepQuestions = questions.filter((question) => getStepName(question) === name);
    return stepQuestions.length === 0 ? [] : [{ name, questions: stepQuestions }];
  });
}
