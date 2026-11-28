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
const yesNo: ClientQuestion = { ...base, id: 'permit', type: 'boolean' };
const date: ClientQuestion = { ...base, id: 'start', type: 'date' };

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

  it.each([true, false])('accepts the yes/no answer %s', (value) => {
    expect(findAnswerError(yesNo, value)).toBeUndefined();
  });

  it.each<[string, AnswerValue]>([
    ['the string "true"', 'true'],
    ['the number 1', 1],
    ['a list', ['true']],
  ])('refuses a yes/no answer that is %s', (_, value) => {
    expect(findAnswerError(yesNo, value)).toBe('wrong_type');
  });

  it.each(['2026-12-01', '2028-02-29', '1999-12-31', '0050-01-01'])('accepts the date %s', (value) => {
    expect(findAnswerError(date, value)).toBeUndefined();
  });

  it.each<[string, AnswerValue, string]>([
    ['a day the month does not have', '2026-02-30', 'not_a_date'],
    ['February 29th in a year that is not a leap year', '2027-02-29', 'not_a_date'],
    ['month 13', '2026-13-01', 'not_a_date'],
    ['written in words', '1 May', 'not_a_date'],
    ['in another order', '01.12.2026', 'not_a_date'],
    ['with a time', '2026-12-01T00:00', 'not_a_date'],
    ['a number', 20261201, 'wrong_type'],
  ])('refuses a date answer that is %s', (_, value, error) => {
    expect(findAnswerError(date, value)).toBe(error);
  });

  const dateInRange: ClientQuestion = { ...date, min: '2026-06-15', max: '2026-12-31' };

  it.each(['2026-06-15', '2026-09-01', '2026-12-31'])(
    'accepts the date %s within min and max, both inclusive',
    (value) => {
      expect(findAnswerError(dateInRange, value)).toBeUndefined();
    },
  );

  it.each([
    ['the day before min', '2026-06-14'],
    ['the day after max', '2027-01-01'],
  ])('refuses a date that is %s', (_, value) => {
    expect(findAnswerError(dateInRange, value)).toBe('out_of_range');
  });

  it('accepts any date after min when there is no max', () => {
    expect(findAnswerError({ ...date, min: '2026-06-15' }, '2099-01-01')).toBeUndefined();
  });

  const file: ClientQuestion = { ...base, id: 'cover_letter', type: 'file' };

  it('accepts a file answer with a content type, base64 data and a file name', () => {
    const answer = { content_type: 'application/pdf', data: 'JVBERi0xLjcK', file_name: 'cover_letter.pdf' };

    expect(findAnswerError(file, answer)).toBeUndefined();
  });

  it.each<[string, AnswerValue]>([
    ['a string', 'cover_letter.pdf'],
    ['a list', ['cover_letter.pdf']],
    ['a file without its data', { content_type: 'application/pdf', file_name: 'a.pdf' } as AnswerValue],
    [
      'a file whose data is a number',
      { content_type: 'a/b', data: 1, file_name: 'a' } as unknown as AnswerValue,
    ],
  ])('refuses a file answer that is %s', (_, value) => {
    expect(findAnswerError(file, value)).toBe('wrong_type');
  });

  const pdf = { content_type: 'application/pdf', data: 'JVBERi0xLjcK', file_name: 'cover_letter.pdf' };

  it.each([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
  ])('accepts a file of type %s', (contentType) => {
    expect(findAnswerError(file, { ...pdf, content_type: contentType })).toBeUndefined();
  });

  it.each(['application/msword', 'image/gif', 'text/plain', ''])(
    'refuses a file of type "%s" with file_type_not_allowed',
    (contentType) => {
      expect(findAnswerError(file, { ...pdf, content_type: contentType })).toBe('file_type_not_allowed');
    },
  );

  it.each(['', '  '])('refuses a file named "%s" with missing_file_name', (fileName) => {
    expect(findAnswerError(file, { ...pdf, file_name: fileName })).toBe('missing_file_name');
  });

  it.each([
    ['has characters outside base64', 'JVBERi0x!jcK'],
    ['is not padded to whole groups of four', 'JVBERi0xLjc'],
    ['has padding in the middle', 'JV==Ri0xLjcK'],
  ])('refuses data that %s with not_base64', (_, data) => {
    expect(findAnswerError(file, { ...pdf, data })).toBe('not_base64');
  });

  it('accepts a file of exactly 5,000,000 bytes, counted after decoding', () => {
    // 1,666,666 groups of three bytes, then a group carrying the last two.
    const data = `${'A'.repeat(1_666_666 * 4)}AAA=`;

    expect(findAnswerError(file, { ...pdf, data })).toBeUndefined();
  });

  it('refuses a file of 5,000,001 bytes with file_too_large', () => {
    const data = 'A'.repeat(1_666_667 * 4);

    expect(findAnswerError(file, { ...pdf, data })).toBe('file_too_large');
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

  it('takes a file without content for no answer, so a required file question is refused as required', () => {
    const requiredFile: ClientQuestion = { ...base, id: 'cover_letter', type: 'file', required: true };
    const emptyFile = { content_type: 'application/pdf', data: '', file_name: 'a.pdf' };

    expect(findInvalidAnswers(questionsOf(requiredFile), { answers: { cover_letter: emptyFile } })).toEqual({
      cover_letter: 'required',
    });
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

  it('takes false for an answer to a required yes/no question, and refuses no answer', () => {
    const questions = questionsOf({ ...yesNo, required: true });

    expect(findInvalidAnswers(questions, { answers: { permit: false } })).toEqual({});
    expect(findInvalidAnswers(questions, { answers: {} })).toEqual({ permit: 'required' });
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
