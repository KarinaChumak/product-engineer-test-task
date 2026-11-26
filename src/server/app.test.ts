// @vitest-environment node
import { createApp } from '@/server/app';
import { jobsFromDirectory, type JobSource } from '@/server/jobs';
import type { JobQuestionnaire } from '@/shared/questionnaire';

function appWith(loadJob: JobSource) {
  return createApp({ loadJob, warn: () => {} });
}

describe('GET /api/jobs/:id/questionnaire', () => {
  it('returns job-short with its questions', async () => {
    const response = await appWith(jobsFromDirectory('jobs')).request('/api/jobs/job-short/questionnaire');

    expect(response.status).toBe(200);
    const questionnaire = (await response.json()) as JobQuestionnaire;
    expect(questionnaire).toMatchObject({
      id: 'job-short',
      title: 'Frontend Developer (React)',
      language: 'en',
    });
    expect(questionnaire.questions.map((q) => q.id)).toEqual([
      'notice_period',
      'salary_expectation',
      'proud_project',
    ]);
  });

  it('removes every screening rule from the questionnaire', async () => {
    const config = {
      id: 'job-rules',
      title: 'Rules',
      company: 'Acme',
      language: 'en',
      questions: [
        { type: 'numeric', id: 'salary', question: 'Salary?', must_be_below: 90000, must_be_at_least: 1 },
        { type: 'select', id: 'notice', question: 'Notice?', must_be_true: true, options: [] },
      ],
    };

    const response = await appWith(async () => config).request('/api/jobs/job-rules/questionnaire');

    expect(await response.text()).not.toMatch(/must_be|90000/);
  });

  it('returns 404 for an unknown job', async () => {
    const response = await appWith(jobsFromDirectory('jobs')).request('/api/jobs/job-missing/questionnaire');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });
});
