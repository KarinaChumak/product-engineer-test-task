// @vitest-environment node
import type { Job, JobQuestion } from '@/server/normalize';
import { buildPrequalificationPayload, isPrequalificationRequest } from '@/server/prequalification';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// The payload is what the employer gets if the candidate passes, so its shape is pinned to the README
// contract here, including every way an answer can be empty.

const question = (client: ClientQuestion): JobQuestion => ({ client });
const base = (id: string) => ({ id, question: `${id}?`, required: false });

const notice = question({
  ...base('notice'),
  type: 'select',
  maxChoices: 1,
  options: [{ label: '1 month', value: '1_month' }],
});
const stack = question({ ...base('stack'), type: 'select', maxChoices: 3, options: [] });
const salary = question({ ...base('salary'), type: 'numeric', min: 0, max: 300000 });
const note = question({ ...base('note'), type: 'text', multiline: true });

const job: Job = { id: 'job-x', title: 'X', company: 'Acme', questions: [notice, stack, salary, note] };

const build = (answers: Record<string, AnswerValue>, forJob: Job = job) =>
  buildPrequalificationPayload(forJob, { answers });

describe('isPrequalificationRequest', () => {
  it.each([
    ['no answers', { answers: {} }],
    ['every answer type', { answers: { a: 'x', b: 1, c: true, d: false, e: 0, f: [], g: ['x', 'y'] } }],
    ['extra fields beside answers, which are ignored', { answers: {}, candidate_id: 'someone-else' }],
  ])('accepts %s', (_, body) => {
    expect(isPrequalificationRequest(body)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'answers'],
    ['a number', 1],
    ['an array', [{ answers: {} }]],
    ['an empty object', {}],
    ['answers that are null', { answers: null }],
    ['answers that are an array', { answers: [{ id: 'a', value: 1 }] }],
    ['answers that are a string', { answers: 'a=1' }],
    ['an answer that is null', { answers: { a: null } }],
    ['an answer that is undefined', { answers: { a: undefined } }],
    ['an answer that is an object', { answers: { a: { value: 1 } } }],
    ['a list with a number in it', { answers: { a: ['x', 1] } }],
    ['a list with a nested list', { answers: { a: [['x']] } }],
    ['one bad answer among good ones', { answers: { a: 'x', b: 1, c: null } }],
  ])('rejects %s', (_, body) => {
    expect(isPrequalificationRequest(body)).toBe(false);
  });
});

describe('buildPrequalificationPayload', () => {
  it('builds the README contract: job id and answers (PR 2 adds screening)', () => {
    expect(build({ notice: '1_month', stack: ['react', 'vue'], salary: 85000, note: 'Hi' })).toEqual({
      job_id: 'job-x',
      answers: [
        { id: 'notice', value: '1_month' },
        { id: 'stack', values: ['react', 'vue'] },
        { id: 'salary', value: 85000 },
        { id: 'note', value: 'Hi' },
      ],
    });
  });

  it('keeps the job order of questions, not the order the answers were sent in', () => {
    const answers = build({ note: 'Hi', salary: 85000, notice: '1_month' }).answers;

    expect(answers.map(({ id }) => id)).toEqual(['notice', 'salary', 'note']);
  });

  it('keeps each value as its JSON type: numbers and booleans are not turned into strings', () => {
    const answers = build({ salary: 85000, note: true }).answers;

    expect(answers).toEqual([
      { id: 'salary', value: 85000 },
      { id: 'note', value: true },
    ]);
    expect(JSON.stringify(answers)).toBe('[{"id":"salary","value":85000},{"id":"note","value":true}]');
  });

  describe('empty answers', () => {
    it('leaves out questions without an answer', () => {
      expect(build({ salary: 85000 }).answers).toEqual([{ id: 'salary', value: 85000 }]);
    });

    it.each([
      ['an empty string', ''],
      ['spaces', '   '],
      ['tabs and line breaks', '\t\n \r\n'],
      ['an empty list', []],
    ])('leaves out an answer that is %s', (_, value) => {
      expect(build({ salary: 85000, note: value }).answers).toEqual([{ id: 'salary', value: 85000 }]);
    });

    it.each([
      ['zero', 0],
      ['false', false],
      ['the string "0"', '0'],
      ['a single space-padded word, as sent', '  Hi  '],
      ['a list with one empty string', ['']],
    ])('keeps an answer that is %s, which is not empty', (_, value) => {
      expect(build({ note: value }).answers).toEqual([
        Array.isArray(value) ? { id: 'note', values: value } : { id: 'note', value },
      ]);
    });

    it('builds an empty answer list when nothing was answered', () => {
      expect(build({}).answers).toEqual([]);
    });
  });

  describe('answers the job does not ask for', () => {
    it('leaves out answers to unknown question ids', () => {
      expect(build({ salary: 85000, made_up: 'x', __proto__: 'x' }).answers).toEqual([
        { id: 'salary', value: 85000 },
      ]);
    });

    it('does not read a question id such as "toString" from the object prototype', () => {
      const tricky: Job = {
        ...job,
        questions: [question({ ...base('toString'), type: 'text', multiline: false })],
      };

      expect(build({}, tricky).answers).toEqual([]);
    });

    it('answers a question whose id looks like a prototype key when it was sent', () => {
      const tricky: Job = {
        ...job,
        questions: [question({ ...base('constructor'), type: 'text', multiline: false })],
      };

      expect(build({ constructor: 'x' }, tricky).answers).toEqual([{ id: 'constructor', value: 'x' }]);
    });
  });

  it('does not change the request it was given', () => {
    const answers = { note: '   ', salary: 85000, extra: 'x' };
    const copy = structuredClone(answers);

    build(answers);

    expect(answers).toEqual(copy);
  });
});
