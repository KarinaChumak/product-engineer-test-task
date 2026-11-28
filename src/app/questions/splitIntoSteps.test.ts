import { splitIntoSteps } from '@/app/questions/splitIntoSteps';
import type { ClientQuestion } from '@/shared/questionnaire';

const select: ClientQuestion = {
  type: 'select',
  id: 'notice_period',
  question: 'What is your notice period?',
  required: true,
  maxChoices: 1,
  options: [{ label: 'Immediately', value: 'immediately' }],
};
const numeric: ClientQuestion = {
  type: 'numeric',
  id: 'salary',
  question: 'Salary?',
  required: true,
  min: 0,
  max: 100,
};
const boolean: ClientQuestion = { type: 'boolean', id: 'eu_work_permit', question: 'EU?', required: true };
const date: ClientQuestion = { type: 'date', id: 'starting_date', question: 'When?', required: true };
const text: ClientQuestion = {
  type: 'text',
  id: 'proud_project',
  question: 'Proud of?',
  required: false,
  multiline: true,
};
const singleLineText: ClientQuestion = { ...text, id: 'city', multiline: false };
const file: ClientQuestion = { type: 'file', id: 'cv', question: 'CV?', required: false };

const getStepIds = (questions: ClientQuestion[]) =>
  splitIntoSteps(questions).map(({ name, questions }) => [name, questions.map(({ id }) => id)]);

describe('splitIntoSteps', () => {
  it('puts select, yes/no, number and date questions in the quick answers', () => {
    expect(getStepIds([select, boolean, numeric, date])).toEqual([
      ['quickAnswers', ['notice_period', 'eu_work_permit', 'salary', 'starting_date']],
    ]);
  });

  it('puts single-line and multiline text and file questions in the own-words step', () => {
    expect(getStepIds([text, singleLineText, file])).toEqual([['ownWords', ['proud_project', 'city', 'cv']]]);
  });

  it('puts a prefilled question in the profile step, whatever its type', () => {
    const prefilled = [
      { ...numeric, prefill: 95000 },
      { ...text, prefill: 'A design system' },
    ];

    expect(getStepIds(prefilled)).toEqual([['fromProfile', ['salary', 'proud_project']]]);
  });

  it('orders the steps profile, quick answers, own words, each keeping the config’s order', () => {
    const questions = [
      text,
      { ...select, prefill: 'immediately' },
      date,
      file,
      boolean,
      { ...numeric, prefill: 5 },
    ];

    expect(getStepIds(questions)).toEqual([
      ['fromProfile', ['notice_period', 'salary']],
      ['quickAnswers', ['starting_date', 'eu_work_permit']],
      ['ownWords', ['proud_project', 'cv']],
    ]);
  });

  it('leaves out a step with no questions', () => {
    expect(getStepIds([text, { ...select, prefill: 'immediately' }])).toEqual([
      ['fromProfile', ['notice_period']],
      ['ownWords', ['proud_project']],
    ]);
    expect(getStepIds([])).toEqual([]);
  });
});
