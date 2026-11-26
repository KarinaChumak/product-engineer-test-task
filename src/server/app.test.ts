// @vitest-environment node
import { createApp } from '@/server/app';
import { jobsFromDirectory, type JobSource } from '@/server/jobs';
import { profileFromFile, type Profile } from '@/server/prefill';
import type { JobQuestionnaire } from '@/shared/questionnaire';

const realProfile = (): Promise<Profile> => profileFromFile('profile.json');

function appWith(loadJob: JobSource, loadProfile = realProfile) {
  return createApp({ loadJob, loadProfile, warn: () => {} });
}

describe('GET /api/jobs/:id/questionnaire', () => {
  it('returns job-short with notice_period prefilled from the profile', async () => {
    const response = await appWith(jobsFromDirectory('jobs', () => {})).request(
      '/api/jobs/job-short/questionnaire',
    );

    expect(response.status).toBe(200);
    const job = (await response.json()) as JobQuestionnaire;
    expect(job).toMatchObject({ id: 'job-short', title: 'Frontend Developer (React)', language: 'en' });
    expect(job.questions.find((q) => q.id === 'notice_period')).toMatchObject({
      type: 'select',
      required: true,
      prefill: '3_months',
    });
  });

  it('removes every screening rule from the job', async () => {
    const config = {
      id: 'job-rules',
      title: 'Rules',
      company: 'Acme',
      language: 'en',
      questions: [
        {
          type: 'select',
          id: 'notice',
          question: 'Notice?',
          must_be_below: 90000,
          must_be_true: true,
          options: [],
        },
      ],
    };

    const response = await appWith(async () => config).request('/api/jobs/job-rules/questionnaire');

    expect(await response.text()).not.toMatch(/must_be|90000/);
  });

  it('does not prefill a profile value that is not one of the options', async () => {
    const response = await appWith(
      jobsFromDirectory('jobs', () => {}),
      async () => ({
        notice_period: 'never',
      }),
    ).request('/api/jobs/job-short/questionnaire');

    const job = (await response.json()) as JobQuestionnaire;
    expect(job.questions.find((q) => q.id === 'notice_period')).not.toHaveProperty('prefill');
  });

  it('returns 404 for an unknown job', async () => {
    const response = await appWith(jobsFromDirectory('jobs', () => {})).request(
      '/api/jobs/job-missing/questionnaire',
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });
});
