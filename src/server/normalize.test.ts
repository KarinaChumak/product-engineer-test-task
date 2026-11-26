// @vitest-environment node
import { toJobQuestionnaire } from '@/server/normalize';

const job = { id: 'job-x', title: 'X', company: 'Acme', questions: [] };

describe('toJobQuestionnaire language', () => {
  it('keeps a supported language', () => {
    expect(toJobQuestionnaire({ ...job, language: 'de' }, () => {}).language).toBe('de');
  });

  it('leaves the language unset when the job has none, so the UI can use the browser language', () => {
    const warnings: string[] = [];

    const questionnaire = toJobQuestionnaire(job, (message) => warnings.push(message));

    expect(questionnaire).not.toHaveProperty('language');
    expect(warnings).toEqual([]);
  });

  it('leaves an unsupported language unset, with a warning', () => {
    const warnings: string[] = [];

    const questionnaire = toJobQuestionnaire({ ...job, language: 'fr' }, (message) => warnings.push(message));

    expect(questionnaire).not.toHaveProperty('language');
    expect(warnings).toEqual([expect.stringContaining('"fr"')]);
  });
});
