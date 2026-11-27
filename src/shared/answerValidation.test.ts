import { describe, expect, it } from 'vitest';
import { findAnswerError, findInvalidAnswers } from '@/shared/answerValidation';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

const base = { question: 'Question?', required: false };
const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
];
const single: ClientQuestion = { ...base, id: 'notice', type: 'select', options, maxChoices: 1 };
const multi: ClientQuestion = { ...base, id: 'stack', type: 'select', options, maxChoices: 2 };
const numeric: ClientQuestion = { ...base, id: 'salary', type: 'numeric', min: 20000, max: 300000 };
const text: ClientQuestion = { ...base, id: 'note', type: 'text', multiline: true };

const questionsOf = (...questions: ClientQuestion[]) => questions;

describe('findAnswerError', () => {
  it('accepts a single-choice answer that is one of the options', () => {
    expect(findAnswerError(single, 'vue')).toBeUndefined();
  });

  it.each<[string, AnswerValue, string]>([
    ['a value that is no option', 'angular', 'not_an_option'],
    ['an option label instead of its value', 'Vue', 'not_an_option'],
    ['an option in another case', 'VUE', 'not_an_option'],
    ['a list, on a single-choice question', ['vue'], 'wrong_type'],
    ['a number', 1, 'wrong_type'],
    ['a boolean', true, 'wrong_type'],
  ])('refuses a single-choice answer that is %s', (_, value, error) => {
    expect(findAnswerError(single, value)).toBe(error);
  });

  it.each<[string, AnswerValue]>([
    ['one choice', ['vue']],
    ['as many choices as allowed', ['react', 'vue']],
  ])('accepts a multi-choice answer with %s', (_, value) => {
    expect(findAnswerError(multi, value)).toBeUndefined();
  });

  it('accepts every option when max_choices is above the option count', () => {
    expect(findAnswerError({ ...multi, maxChoices: 5 }, ['react', 'vue', 'svelte'])).toBeUndefined();
  });

  it.each<[string, AnswerValue, string]>([
    ['more choices than allowed', ['react', 'vue', 'svelte'], 'too_many_choices'],
    ['a choice that is no option', ['react', 'angular'], 'not_an_option'],
    ['the same choice twice', ['vue', 'vue'], 'repeated_choice'],
    ['a single string, on a multi-choice question', 'vue', 'wrong_type'],
  ])('refuses a multi-choice answer with %s', (_, value, error) => {
    expect(findAnswerError(multi, value)).toBe(error);
  });

  it.each([20000, 20001, 95000, 300000])(
    'accepts the integer %d within min and max, both inclusive',
    (value) => {
      expect(findAnswerError(numeric, value)).toBeUndefined();
    },
  );

  it.each<[string, AnswerValue, string]>([
    ['one below min', 19999, 'out_of_range'],
    ['one above max', 300001, 'out_of_range'],
    ['negative', -50000, 'out_of_range'],
    ['a fraction', 95000.5, 'not_an_integer'],
    ['a fraction just inside the range', 20000.1, 'not_an_integer'],
    ['a number in a string', '95000', 'wrong_type'],
    ['a boolean', true, 'wrong_type'],
  ])('refuses a numeric answer that is %s', (_, value, error) => {
    expect(findAnswerError(numeric, value)).toBe(error);
  });

  it('accepts 0 when the range allows it', () => {
    expect(findAnswerError({ ...numeric, min: 0 }, 0)).toBeUndefined();
  });

  it.each<[string, string]>([
    ['a short answer', 'A design system'],
    ['exactly 5,000 characters', 'x'.repeat(5000)],
    ['5,000 emoji, counted as one character each', '🚀'.repeat(5000)],
  ])('accepts a text answer that is %s', (_, value) => {
    expect(findAnswerError(text, value)).toBeUndefined();
  });

  it.each<[string, AnswerValue, string]>([
    ['5,001 characters', 'x'.repeat(5001), 'too_long'],
    ['a number', 42, 'wrong_type'],
    ['a list', ['a'], 'wrong_type'],
  ])('refuses a text answer that is %s', (_, value, error) => {
    expect(findAnswerError(text, value)).toBe(error);
  });
});

describe('findInvalidAnswers', () => {
  it('finds nothing wrong with valid answers', () => {
    const questions = questionsOf(single, numeric, text);

    expect(findInvalidAnswers(questions, { answers: { notice: 'vue', salary: 50000, note: 'Hi' } })).toEqual(
      {},
    );
  });

  it.each<[string, Record<string, AnswerValue>]>([
    ['missing', {}],
    ['blank', { note: ' \t ' }],
    ['empty', { note: '' }],
  ])('refuses a required answer that is %s', (_, answers) => {
    const questions = questionsOf({ ...text, required: true });

    expect(findInvalidAnswers(questions, { answers })).toEqual({ note: 'required' });
  });

  it('refuses a required multi-choice answer with no choices', () => {
    expect(findInvalidAnswers(questionsOf({ ...multi, required: true }), { answers: { stack: [] } })).toEqual(
      {
        stack: 'required',
      },
    );
  });

  it.each<[string, Record<string, AnswerValue>]>([
    ['missing', {}],
    ['blank', { note: '   ' }],
    ['an empty list', { stack: [] }],
  ])('accepts an optional answer that is %s', (_, answers) => {
    expect(findInvalidAnswers(questionsOf(text, multi), { answers })).toEqual({});
  });

  it('checks an optional answer that is given', () => {
    expect(findInvalidAnswers(questionsOf(numeric), { answers: { salary: 1 } })).toEqual({
      salary: 'out_of_range',
    });
  });

  it('takes 0 for an answer to a required question, not for an empty one', () => {
    const questions = questionsOf({ ...numeric, min: 0, required: true });

    expect(findInvalidAnswers(questions, { answers: { salary: 0 } })).toEqual({});
  });

  it('reports every refused answer at once, not only the first', () => {
    const questions = questionsOf({ ...single, required: true }, numeric, text);

    expect(findInvalidAnswers(questions, { answers: { salary: 1.5, note: 'x'.repeat(5001) } })).toEqual({
      notice: 'required',
      salary: 'not_an_integer',
      note: 'too_long',
    });
  });

  it('ignores answers to questions the job does not ask', () => {
    expect(findInvalidAnswers(questionsOf(text), { answers: { made_up: 42 } })).toEqual({});
  });

  it('does not take an inherited key such as toString for an answer', () => {
    const questions = questionsOf({ ...text, id: 'toString', required: true });

    expect(findInvalidAnswers(questions, { answers: {} })).toEqual({ toString: 'required' });
  });
});
