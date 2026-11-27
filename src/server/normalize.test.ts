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
