// @vitest-environment node
import { readFile } from 'node:fs/promises';
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

describe('parseJob duplicate question ids', () => {
  const text = (id: string, question: string, extra: object = {}) => ({
    type: 'text',
    id,
    question,
    ...extra,
  });

  it('keeps only the first question with an id, with a warning', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [text('notice', 'First?'), text('salary', 'Salary?'), text('notice', 'Second?')],
    });

    expect(parsed.questions.map(({ client }) => [client.id, client.question])).toEqual([
      ['notice', 'First?'],
      ['salary', 'Salary?'],
    ]);
    expect(warnings).toEqual([expect.stringContaining('"notice"')]);
  });

  it('keeps the rules of the first question, not the dropped one', () => {
    const { job: parsed } = parse({
      ...job,
      questions: [
        { type: 'numeric', id: 'salary', question: 'First?' },
        { type: 'numeric', id: 'salary', question: 'Second?', must_be_below: 90000 },
      ],
    });

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0]?.rules).toEqual({});
  });

  it('keeps a later question when the first with its id was dropped for an unsupported type', () => {
    const { job: parsed } = parse({
      ...job,
      questions: [text('start', 'When?', { type: 'date' }), text('start', 'Start date as text?')],
    });

    expect(parsed.questions.map(({ client }) => client.question)).toEqual(['Start date as text?']);
  });

  it('leaves job-bad with one notice_period question and no other duplicate', async () => {
    const raw: unknown = JSON.parse(await readFile('jobs/bad.json', 'utf8'));

    const ids = parseJob(raw, () => {}).questions.map(({ client }) => client.id);

    expect(ids.filter((id) => id === 'notice_period')).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('parseJob screening rules', () => {
  it('keeps the numeric rules of a numeric question', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ ...salary, must_be_at_least: 30000, must_be_below: 90000 }],
    });

    expect(parsed.questions[0]?.rules).toEqual({ mustBeAtLeast: 30000, mustBeBelow: 90000 });
    expect(warnings).toEqual([]);
  });

  it('ignores a numeric rule on a question of another type, with a warning', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ type: 'text', id: 'city', question: 'City?', must_be_at_least: 3 }],
    });

    expect(parsed.questions[0]?.rules).toEqual({});
    expect(warnings).toEqual([expect.stringContaining('must_be_at_least on "city"')]);
  });

  it('keeps a yes/no question', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ type: 'boolean', id: 'permit', question: 'EU permit?', required: true }],
    });

    expect(parsed.questions[0]?.client).toEqual({
      type: 'boolean',
      id: 'permit',
      question: 'EU permit?',
      required: true,
    });
    expect(warnings).toEqual([]);
  });

  it('ignores must_be_true on a question that is not boolean, with a warning', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ type: 'text', id: 'country', question: 'Country?', must_be_true: true }],
    });

    expect(parsed.questions[0]?.rules).toEqual({});
    expect(warnings).toEqual([expect.stringContaining('must_be_true on "country"')]);
  });

  it('keeps must_be_true on a yes/no question as a rule', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ type: 'boolean', id: 'permit', question: 'Permit?', must_be_true: true }],
    });

    expect(parsed.questions[0]?.rules).toEqual({ mustBeTrue: true });
    expect(warnings).toEqual([]);
  });

  it('ignores a must_be_true that is not true, with a warning', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ type: 'boolean', id: 'permit', question: 'Permit?', must_be_true: 'yes' }],
    });

    expect(parsed.questions[0]?.rules).toEqual({});
    expect(warnings).toEqual(['Ignored must_be_true on "permit": it isn\'t true']);
  });

  it('ignores a rule whose threshold is not a number, with a warning', () => {
    const { job: parsed, warnings } = parse({ ...job, questions: [{ ...salary, must_be_below: '90000' }] });

    expect(parsed.questions[0]?.rules).toEqual({});
    expect(warnings).toEqual([expect.stringContaining('must_be_below on "salary"')]);
  });
});

describe('parseJob profile fields', () => {
  it('keeps a profile field the README lists, without a warning', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ ...salary, profile_field: 'years_of_experience' }],
    });

    expect(parsed.questions[0]).toMatchObject({ profileField: 'years_of_experience' });
    expect(warnings).toEqual([]);
  });

  it('drops an unknown profile field with one warning, so the question is never prefilled', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ ...salary, profile_field: 'shoe_size' }],
    });

    expect(parsed.questions[0]).not.toHaveProperty('profileField');
    expect(warnings).toEqual([expect.stringContaining('"shoe_size"')]);
    expect(toJobQuestionnaire(parsed, { years_of_experience: 6 }).questions[0]).not.toHaveProperty('prefill');
  });
});

describe('toJobQuestionnaire', () => {
  it('sends only the client question, without its profile field or screening rules', () => {
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
