// @vitest-environment node
import type { Job, JobQuestion } from '@/server/normalize';
import {
  buildPrequalificationPayload,
  collectJobAnswers,
  isPrequalificationRequest,
} from '@/server/prequalification';
import { screenAnswers } from '@/server/screening';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// The payload is what the employer gets if the candidate passes, so its shape is pinned to the README
// contract here, including every way an answer can be empty.

const question = (client: ClientQuestion, rules: JobQuestion['rules'] = {}): JobQuestion => ({
  client,
  rules,
});
const base = (id: string) => ({ id, question: `${id}?`, required: false });

const notice = question({
  ...base('notice'),
  type: 'select',
  maxChoices: 1,
  options: [{ label: '1 month', value: '1_month' }],
});
const stack = question({ ...base('stack'), type: 'select', maxChoices: 3, options: [] });
const salary = question({ ...base('salary'), type: 'numeric', min: 0, max: 300000 }, { mustBeBelow: 90000 });
const note = question({ ...base('note'), type: 'text', multiline: true });

const job: Job = { id: 'job-x', title: 'X', company: 'Acme', questions: [notice, stack, salary, note] };

/** The collected answers as `[id, value]` pairs, in their order. */
const collect = (answers: Record<string, AnswerValue>, forJob: Job = job) => [
  ...collectJobAnswers(forJob, { answers }),
];

/** What the route stores: the collected answers, screened, as the payload. */
const build = (answers: Record<string, AnswerValue>, forJob: Job = job) => {
  const collected = collectJobAnswers(forJob, { answers });
  return buildPrequalificationPayload(forJob.id, collected, screenAnswers(forJob, collected));
};

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

describe('collectJobAnswers', () => {
  it('keeps the job order of questions, not the order the answers were sent in', () => {
    expect(collect({ note: 'Hi', salary: 85000, notice: '1_month' }).map(([id]) => id)).toEqual([
      'notice',
      'salary',
      'note',
    ]);
  });

  describe('empty answers', () => {
    it('leaves out questions without an answer', () => {
      expect(collect({ salary: 85000 })).toEqual([['salary', 85000]]);
    });

    it.each([
      ['an empty string', ''],
      ['spaces', '   '],
      ['tabs and line breaks', '\t\n \r\n'],
      ['an empty list', []],
    ])('leaves out an answer that is %s', (_, value) => {
      expect(collect({ salary: 85000, note: value })).toEqual([['salary', 85000]]);
    });

    it.each([
      ['zero', 0],
      ['false', false],
      ['the string "0"', '0'],
      ['a single space-padded word, as sent', '  Hi  '],
      ['a list with one empty string', ['']],
    ])('keeps an answer that is %s, which is not empty', (_, value) => {
      expect(collect({ note: value })).toEqual([['note', value]]);
    });

    it('collects nothing when nothing was answered', () => {
      expect(collect({})).toEqual([]);
    });
  });

  describe('answers the job does not ask for', () => {
    it('leaves out answers to unknown question ids', () => {
      expect(collect({ salary: 85000, made_up: 'x', __proto__: 'x' })).toEqual([['salary', 85000]]);
    });

    it('does not read a question id such as "toString" from the object prototype', () => {
      const tricky: Job = {
        ...job,
        questions: [question({ ...base('toString'), type: 'text', multiline: false })],
      };

      expect(collect({}, tricky)).toEqual([]);
    });

    it('answers a question whose id looks like a prototype key when it was sent', () => {
      const tricky: Job = {
        ...job,
        questions: [question({ ...base('constructor'), type: 'text', multiline: false })],
      };

      expect(collect({ constructor: 'x' }, tricky)).toEqual([['constructor', 'x']]);
    });
  });

  it('does not change the request it was given', () => {
    const answers = { note: '   ', salary: 85000, extra: 'x' };
    const copy = structuredClone(answers);

    collect(answers);

    expect(answers).toEqual(copy);
  });
});

describe('buildPrequalificationPayload', () => {
  it('builds the README contract: job id, answers and screening', () => {
    expect(build({ notice: '1_month', stack: ['react', 'vue'], salary: 85000, note: 'Hi' })).toEqual({
      job_id: 'job-x',
      answers: [
        { id: 'notice', value: '1_month' },
        { id: 'stack', values: ['react', 'vue'] },
        { id: 'salary', value: 85000 },
        { id: 'note', value: 'Hi' },
      ],
      screening: { passed: true, failed: [] },
    });
  });

  it('keeps each value as its JSON type: numbers and booleans are not turned into strings', () => {
    const answers = build({ salary: 85000, note: true }).answers;

    expect(answers).toEqual([
      { id: 'salary', value: 85000 },
      { id: 'note', value: true },
    ]);
    expect(JSON.stringify(answers)).toBe('[{"id":"salary","value":85000},{"id":"note","value":true}]');
  });

  it('builds an empty answer list when nothing was answered', () => {
    expect(build({}).answers).toEqual([]);
  });
});

// The route screens the collected answers, so an answer left out as empty is screened as missing.
describe('screening the collected answers', () => {
  it('screens the answers that were kept', () => {
    expect(build({ salary: 95000 }).screening).toEqual({ passed: false, failed: ['salary'] });
  });

  it('fails a ruled question whose answer was left out as empty', () => {
    const payload = build({ salary: [] });

    expect(payload.answers).toEqual([]);
    expect(payload.screening).toEqual({ passed: false, failed: ['salary'] });
  });

  it('passes a job without rules whatever was answered', () => {
    const noRules: Job = { ...job, questions: [notice, note] };

    expect(build({}, noRules).screening).toEqual({ passed: true, failed: [] });
  });
});
