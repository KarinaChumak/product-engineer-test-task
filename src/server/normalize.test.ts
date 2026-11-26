// @vitest-environment node
import { parseJob, toJobQuestionnaire } from '@/server/normalize';

const job = { id: 'job-x', title: 'X', company: 'Acme', questions: [] };

/** Parses `raw`, collecting the warnings. */
const parse = (raw: unknown) => {
  const warnings: string[] = [];
  return { job: parseJob(raw, (message) => warnings.push(message)), warnings };
};

describe('parseJob language', () => {
  it('keeps a supported language', () => {
    expect(parse({ ...job, language: 'de' }).job.language).toBe('de');
  });

  it('leaves the language unset when the job has none, so the UI can use the browser language', () => {
    const { job: parsed, warnings } = parse(job);

    expect(parsed).not.toHaveProperty('language');
    expect(warnings).toEqual([]);
  });

  it('leaves an unsupported language unset, with a warning', () => {
    const { job: parsed, warnings } = parse({ ...job, language: 'fr' });

    expect(parsed).not.toHaveProperty('language');
    expect(warnings).toEqual([expect.stringContaining('"fr"')]);
  });
});

const salary = { type: 'numeric', id: 'salary', question: 'Salary?', min: 0, max: 200000 };

describe('parseJob screening rules', () => {
  it('keeps the numeric rules on a numeric question, with their thresholds', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ ...salary, must_be_at_least: 30000, must_be_below: 90000 }],
    });

    expect(parsed.questions[0]?.rules).toEqual([
      { type: 'must_be_at_least', threshold: 30000 },
      { type: 'must_be_below', threshold: 90000 },
    ]);
    expect(warnings).toEqual([]);
  });

  it('ignores a rule on a type it is not allowed on, with a warning', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [
        { type: 'text', id: 'country', question: 'Country?', must_be_true: true },
        { type: 'select', id: 'notice', question: 'Notice?', options: [], must_be_below: 3 },
      ],
    });

    expect(parsed.questions.map((question) => question.rules)).toEqual([[], []]);
    expect(warnings).toEqual([
      expect.stringContaining('must_be_true on "country"'),
      expect.stringContaining('must_be_below on "notice"'),
    ]);
  });

  it('ignores a numeric rule whose threshold is not a number, with a warning', () => {
    const { job: parsed, warnings } = parse({ ...job, questions: [{ ...salary, must_be_below: '90000' }] });

    expect(parsed.questions[0]?.rules).toEqual([]);
    expect(warnings).toEqual([expect.stringContaining('"90000" is not a number')]);
  });
});

describe('toJobQuestionnaire', () => {
  it('leaves out the rules and profile fields that the parsed job keeps', () => {
    const { job: parsed } = parse({
      ...job,
      questions: [{ ...salary, profile_field: 'salary_expectation', must_be_below: 90000 }],
    });

    const questionnaire = toJobQuestionnaire(parsed);

    expect(questionnaire.questions).toEqual([
      { type: 'numeric', id: 'salary', question: 'Salary?', required: false, min: 0, max: 200000 },
    ]);
    expect(JSON.stringify(questionnaire)).not.toMatch(/must_be|90000|profile/);
  });
});
