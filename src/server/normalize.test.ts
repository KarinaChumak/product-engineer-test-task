// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { parseJob, toJobQuestionnaire } from '@/server/normalize';

const job = { id: 'job-x', title: 'X', company: 'Acme', questions: [] };
const today = '2026-06-15';

/** Parses `raw`, collecting the warnings. */
const parse = (raw: unknown) => {
  const warnings: string[] = [];
  return { job: parseJob(raw, today, (message) => warnings.push(message)), warnings };
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
      questions: [text('cv', 'Your CV?', { type: 'video' }), text('cv', 'Link to your CV?')],
    });

    expect(parsed.questions.map(({ client }) => client.question)).toEqual(['Link to your CV?']);
  });

  it('leaves job-bad with one notice_period question and no other duplicate', async () => {
    const raw: unknown = JSON.parse(await readFile('jobs/bad.json', 'utf8'));

    const ids = parseJob(raw, today, () => {}).questions.map(({ client }) => client.id);

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

  it('keeps a date question', () => {
    const { job: parsed, warnings } = parse({
      ...job,
      questions: [{ type: 'date', id: 'start', question: 'Start?', required: true }],
    });

    expect(parsed.questions[0]?.client).toEqual({
      type: 'date',
      id: 'start',
      question: 'Start?',
      required: true,
    });
    expect(warnings).toEqual([]);
  });

  const parseDateQuestion = (bounds: Record<string, unknown>) =>
    parse({ ...job, questions: [{ type: 'date', id: 'start', question: 'Start?', ...bounds }] });

  it('turns a date question’s "today" into the server’s date, so the client gets plain dates', () => {
    const { job: parsed, warnings } = parseDateQuestion({ min: 'today', max: '2027-12-31' });

    expect(parsed.questions[0]?.client).toMatchObject({ min: '2026-06-15', max: '2027-12-31' });
    expect(warnings).toEqual([]);
  });

  it('keeps a date question with only a max', () => {
    const { job: parsed } = parseDateQuestion({ max: 'today' });

    expect(parsed.questions[0]?.client).toEqual({
      type: 'date',
      id: 'start',
      question: 'Start?',
      required: false,
      max: '2026-06-15',
    });
  });

  it('keeps a date question whose min and max are the same day', () => {
    const { job: parsed, warnings } = parseDateQuestion({ min: '2026-07-01', max: '2026-07-01' });

    expect(parsed.questions[0]?.client).toMatchObject({ min: '2026-07-01', max: '2026-07-01' });
    expect(warnings).toEqual([]);
  });

  it.each([
    ['text', 'next week'],
    ['a date that does not exist', '2026-02-30'],
    ['a date in another format', '01.07.2026'],
    ['a number', 20260701],
  ])('drops a bound that is %s, with a warning', (_, bound) => {
    const { job: parsed, warnings } = parseDateQuestion({ min: bound, max: '2027-12-31' });

    const client = parsed.questions[0]?.client;
    expect(client).toMatchObject({ max: '2027-12-31' });
    expect(client).not.toHaveProperty('min');
    expect(warnings).toEqual([expect.stringContaining('min on "start"')]);
  });

  it('drops both bounds when min is after max, with one warning', () => {
    const { job: parsed, warnings } = parseDateQuestion({ min: '2027-01-01', max: '2026-12-31' });

    const client = parsed.questions[0]?.client;
    expect(client).not.toHaveProperty('min');
    expect(client).not.toHaveProperty('max');
    expect(warnings).toEqual([expect.stringContaining('min and max on "start"')]);
  });

  it('drops both bounds when "today" as min is after max', () => {
    const { job: parsed, warnings } = parseDateQuestion({ min: 'today', max: '2026-06-01' });

    expect(parsed.questions[0]?.client).not.toHaveProperty('min');
    expect(warnings).toHaveLength(1);
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

describe('parseJob file questions', () => {
  it('keeps a file question as { type: file }, without a warning', () => {
    const cover = { type: 'file', id: 'cover_letter', question: 'Cover letter?', required: true };

    const { job: parsed, warnings } = parse({ ...job, questions: [cover] });

    expect(toJobQuestionnaire(parsed).questions).toEqual([
      { type: 'file', id: 'cover_letter', question: 'Cover letter?', required: true },
    ]);
    expect(warnings).toEqual([]);
  });
});

describe('parseJob job-bad', () => {
  it('logs one warning per repair of jobs/bad.json', async () => {
    const raw: unknown = JSON.parse(await readFile('jobs/bad.json', 'utf8'));

    const { warnings } = parse(raw);

    expect(warnings).toEqual([
      'Dropped a second question "notice_period": only the first question with an id counts',
      'Ignored must_be_true on "country": it only applies to boolean questions',
      'Capped max_choices on "tech_stack" at 5, its number of options, from 10',
      'Dropped question "typescript_level": type "rating" is not supported',
    ]);
  });
});

describe('parseJob select questions', () => {
  const options = [
    { label: 'React', value: 'react' },
    { label: 'Vue', value: 'vue' },
  ];
  const parseSelect = (extra: object) =>
    parse({ ...job, questions: [{ type: 'select', id: 'stack', question: 'Stack?', options, ...extra }] });

  it('keeps a max_choices within the options, without a warning', () => {
    const { job: parsed, warnings } = parseSelect({ max_choices: 2 });

    expect(parsed.questions[0]?.client).toMatchObject({ maxChoices: 2 });
    expect(warnings).toEqual([]);
  });

  it('caps max_choices at the number of options, with a warning', () => {
    const { job: parsed, warnings } = parseSelect({ max_choices: 10 });

    expect(parsed.questions[0]?.client).toMatchObject({ maxChoices: 2 });
    expect(warnings).toEqual(['Capped max_choices on "stack" at 2, its number of options, from 10']);
  });

  it.each([0, -1])('makes a max_choices of %i a single choice, with a warning', (maxChoices) => {
    const { job: parsed, warnings } = parseSelect({ max_choices: maxChoices });

    expect(parsed.questions[0]?.client).toMatchObject({ maxChoices: 1 });
    expect(warnings).toEqual([expect.stringContaining('max_choices on "stack" to 1')]);
  });

  it.each([
    ['no options', undefined],
    ['an empty option list', []],
    ['only options without a label or value', [{ label: 'React' }, 'vue']],
  ])('drops a select question with %s, with a warning', (_, rawOptions) => {
    const { job: parsed, warnings } = parseSelect({ options: rawOptions, required: true });

    expect(parsed.questions).toEqual([]);
    expect(warnings).toEqual(['Dropped question "stack": a select question needs at least one option']);
  });
});

describe('parseJob numeric ranges', () => {
  const parseNumeric = (range: object) => parse({ ...job, questions: [{ ...salary, ...range }] });

  it('keeps a min equal to max, without a warning', () => {
    const { job: parsed, warnings } = parseNumeric({ min: 5, max: 5 });

    expect(parsed.questions[0]?.client).toMatchObject({ min: 5, max: 5 });
    expect(warnings).toEqual([]);
  });

  it('drops both bounds when min is above max, with one warning', () => {
    const { job: parsed, warnings } = parseNumeric({ min: 50, max: 5 });

    expect(parsed.questions[0]?.client).toMatchObject({ min: 0, max: 100_000_000 });
    expect(warnings).toEqual(['Ignored min and max on "salary": min 50 is above max 5']);
  });

  it('drops both bounds when only a min is set, above the default max', () => {
    const { job: parsed, warnings } = parseNumeric({ min: 200_000_000, max: undefined });

    expect(parsed.questions[0]?.client).toMatchObject({ min: 0, max: 100_000_000 });
    expect(warnings).toHaveLength(1);
  });
});

describe('parseJob question text', () => {
  const parseText = (question: string) =>
    parse({ ...job, questions: [{ type: 'text', id: 'about', question }] });

  it('keeps a question of 255 characters as it is, without a warning', () => {
    const question = 'a'.repeat(255);

    const { job: parsed, warnings } = parseText(question);

    expect(parsed.questions[0]?.client.question).toBe(question);
    expect(warnings).toEqual([]);
  });

  it('cuts a longer question to 255 characters, the last an ellipsis, with a warning', () => {
    const { job: parsed, warnings } = parseText('a'.repeat(300));

    expect(parsed.questions[0]?.client.question).toBe(`${'a'.repeat(254)}…`);
    expect(warnings).toEqual(['Cut the question text of "about" to 255 characters, from 300']);
  });

  it('counts an emoji as one character and never splits it', () => {
    const { job: parsed } = parseText('🚀'.repeat(300));

    const question = parsed.questions[0]?.client.question ?? '';
    expect([...question]).toHaveLength(255);
    expect(question).toBe(`${'🚀'.repeat(254)}…`);
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
