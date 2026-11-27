// @vitest-environment node
import { readFileSync } from 'node:fs';
import { parseJob, type Job, type JobQuestion, type ScreeningRules } from '@/server/normalize';
import { screenAnswers } from '@/server/screening';
import type { AnswerValue } from '@/shared/questionnaire';

// Screening decides whether a candidate's answers reach the employer, so every rule boundary is pinned here.

const numeric = (id: string, rules: ScreeningRules = {}): JobQuestion => ({
  client: { type: 'numeric', id, question: `${id}?`, required: true, min: 0, max: 100_000_000 },
  rules,
});

const text = (id: string): JobQuestion => ({
  client: { type: 'text', id, question: `${id}?`, required: false, multiline: false },
  rules: {},
});

const jobOf = (...questions: JobQuestion[]): Job => ({ id: 'job-x', title: 'X', company: 'Acme', questions });

const screen = (job: Job, answers: Record<string, AnswerValue>) =>
  screenAnswers(job, new Map(Object.entries(answers)));

/** Parses a real job config from `jobs/`, without its repair warnings. */
const parseJobFile = (file: string) => parseJob(JSON.parse(readFileSync(`jobs/${file}`, 'utf8')), () => {});

describe('screenAnswers', () => {
  describe('without rules', () => {
    it('passes a job with no questions', () => {
      expect(screen(jobOf(), {})).toEqual({ passed: true, failed: [] });
    });

    it('passes questions without a rule, answered or not', () => {
      expect(screen(jobOf(numeric('salary'), text('note')), {})).toEqual({ passed: true, failed: [] });
      expect(screen(jobOf(numeric('salary'), text('note')), { salary: 1, note: 'x' })).toEqual({
        passed: true,
        failed: [],
      });
    });
  });

  describe('must_be_at_least', () => {
    const years = jobOf(numeric('years', { mustBeAtLeast: 3 }));

    it.each([
      ['passes at the threshold', 3, true],
      ['passes above it', 4, true],
      ['passes far above it', 1_000_000, true],
      ['fails one below it', 2, false],
      ['fails at zero', 0, false],
      ['fails a negative answer', -3, false],
    ])('%s (%d)', (_, answer, passed) => {
      expect(screen(years, { years: answer })).toEqual({ passed, failed: passed ? [] : ['years'] });
    });

    it('compares against a threshold of zero, which zero meets', () => {
      expect(screen(jobOf(numeric('years', { mustBeAtLeast: 0 })), { years: 0 }).passed).toBe(true);
    });

    it('compares against a negative threshold', () => {
      const job = jobOf(numeric('balance', { mustBeAtLeast: -10 }));

      expect(screen(job, { balance: -10 }).passed).toBe(true);
      expect(screen(job, { balance: -11 }).passed).toBe(false);
    });

    it('compares a whole answer against a fractional threshold', () => {
      const job = jobOf(numeric('years', { mustBeAtLeast: 2.5 }));

      expect(screen(job, { years: 2 }).passed).toBe(false);
      expect(screen(job, { years: 3 }).passed).toBe(true);
    });
  });

  describe('must_be_below', () => {
    const salary = jobOf(numeric('salary', { mustBeBelow: 90000 }));

    it.each([
      ['passes one below the threshold', 89999, true],
      ['passes well below it', 85000, true],
      ['passes at zero', 0, true],
      ['fails at the threshold, which is strict', 90000, false],
      ['fails one above it', 90001, false],
      ['fails far above it', 95000, false],
    ])('%s (%d)', (_, answer, passed) => {
      expect(screen(salary, { salary: answer })).toEqual({ passed, failed: passed ? [] : ['salary'] });
    });

    it('fails everything with a threshold of zero, as nothing allowed is below it', () => {
      expect(screen(jobOf(numeric('salary', { mustBeBelow: 0 })), { salary: 0 }).passed).toBe(false);
    });
  });

  describe('both rules on one question', () => {
    const range = jobOf(numeric('years', { mustBeAtLeast: 2, mustBeBelow: 10 }));

    it.each([
      ['passes at the lower bound', 2, true],
      ['passes inside the range', 5, true],
      ['passes just under the upper bound', 9, true],
      ['fails below the lower bound', 1, false],
      ['fails at the upper bound', 10, false],
    ])('%s (%d)', (_, answer, passed) => {
      expect(screen(range, { years: answer }).passed).toBe(passed);
    });

    it('lists the question once when it fails', () => {
      expect(screen(range, { years: 50 }).failed).toEqual(['years']);
    });

    it('fails every answer when the range is impossible (at least 100, below 50)', () => {
      const impossible = jobOf(numeric('years', { mustBeAtLeast: 100, mustBeBelow: 50 }));

      for (const years of [0, 49, 50, 75, 100, 101]) expect(screen(impossible, { years }).passed).toBe(false);
    });
  });

  describe('answers a rule cannot read', () => {
    const salary = jobOf(numeric('salary', { mustBeBelow: 90000 }));

    it('fails a missing answer', () => {
      expect(screen(salary, {})).toEqual({ passed: false, failed: ['salary'] });
    });

    it.each([
      ['a numeric string', '85000'],
      ['an empty string', ''],
      ['a boolean', true],
      ['false', false],
      ['a list', ['85000']],
    ])('fails %s instead of reading it as a number', (_, answer) => {
      expect(screen(salary, { salary: answer as AnswerValue })).toEqual({
        passed: false,
        failed: ['salary'],
      });
    });
  });

  describe('several questions', () => {
    const job = jobOf(
      numeric('years', { mustBeAtLeast: 5 }),
      text('note'),
      numeric('salary', { mustBeBelow: 90000 }),
      numeric('age'),
    );

    it('passes when every rule passes', () => {
      expect(screen(job, { years: 5, salary: 89999 })).toEqual({ passed: true, failed: [] });
    });

    it('lists every failed question, in the job order', () => {
      expect(screen(job, { salary: 95000, years: 1 })).toEqual({
        passed: false,
        failed: ['years', 'salary'],
      });
    });

    it('lists only the questions that failed', () => {
      expect(screen(job, { years: 10, salary: 95000 })).toEqual({ passed: false, failed: ['salary'] });
    });

    it('ignores answers to questions the job does not ask', () => {
      expect(screen(job, { years: 5, salary: 1, unknown: 0 })).toEqual({ passed: true, failed: [] });
    });
  });

  describe('the real job configs', () => {
    it('screens job-long on salary and years of experience', () => {
      const job = parseJobFile('long.json');

      expect(screen(job, { salary_expectation: 85000, years_of_experience: 5 })).toEqual({
        passed: true,
        failed: [],
      });
      expect(screen(job, { salary_expectation: 90000, years_of_experience: 4 })).toEqual({
        passed: false,
        failed: ['salary_expectation', 'years_of_experience'],
      });
    });

    it('fails job-long on missing ruled answers but not on missing unruled ones', () => {
      expect(screen(parseJobFile('long.json'), {})).toEqual({
        passed: false,
        failed: ['salary_expectation', 'years_of_experience'],
      });
    });

    it('screens job-bad only by its rules that apply: must_be_true on a text question is ignored', () => {
      const job = parseJobFile('bad.json');

      expect(screen(job, { salary_expectation: 64999 })).toEqual({ passed: true, failed: [] });
      expect(screen(job, { salary_expectation: 65000 })).toEqual({
        passed: false,
        failed: ['salary_expectation'],
      });
    });

    it('has no rule on job-short, so any answers pass', () => {
      expect(screen(parseJobFile('short.json'), {})).toEqual({ passed: true, failed: [] });
    });

    it.todo('fails job-long when eu_work_permit is false or missing (boolean questions come in Phase 2)');
  });
});
