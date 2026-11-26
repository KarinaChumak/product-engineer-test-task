import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { renderAt } from '@/test/render';
import { server } from '@/test/server';
import type { JobQuestionnaire } from '@/shared/questionnaire';

const anyJob = '/api/jobs/:id/questionnaire';

const noQuestions: JobQuestionnaire = {
  id: 'job-short',
  title: 'Frontend Developer (React)',
  company: 'Kranich Health GmbH',
  language: 'en',
  questions: [],
};

describe('QuestionnairePage', () => {
  it('shows a loading state while the questionnaire loads', () => {
    server.use(http.get(anyJob, () => delay('infinite')));
    renderAt('/jobs/job-short');

    expect(screen.getByRole('status')).toHaveTextContent('Loading the job…');
  });

  it('shows the title and company of the job it asked for', async () => {
    server.use(http.get('/api/jobs/job-short/questionnaire', () => HttpResponse.json(noQuestions)));
    renderAt('/jobs/job-short');

    expect(await screen.findByRole('heading', { name: 'Frontend Developer (React)' })).toBeInTheDocument();
    expect(screen.getByText('Kranich Health GmbH')).toBeInTheDocument();
  });

  it('says so when the job has no questions to answer', async () => {
    server.use(http.get(anyJob, () => HttpResponse.json(noQuestions)));
    renderAt('/jobs/job-short');

    expect(await screen.findByText('This job has no questions for you to answer.')).toBeInTheDocument();
  });

  it('shows a job-not-found state for an unknown job', async () => {
    server.use(http.get(anyJob, () => HttpResponse.json({ error: 'not_found' }, { status: 404 })));
    renderAt('/jobs/job-missing');

    expect(await screen.findByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
  });

  it('says the server had a problem when the questionnaire fails with a 500', async () => {
    server.use(http.get(anyJob, () => HttpResponse.json({ error: 'internal' }, { status: 500 })));
    renderAt('/jobs/job-short');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load this job');
    expect(alert).toHaveTextContent('Our server ran into a problem.');
  });

  it('says the server could not be reached on a network error', async () => {
    server.use(http.get(anyJob, () => HttpResponse.error()));
    renderAt('/jobs/job-short');

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t reach the server.');
  });

  it('loads the questionnaire again on "Try again"', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(anyJob, () => HttpResponse.json({ error: 'internal' }, { status: 500 }), { once: true }),
      http.get(anyJob, () => HttpResponse.json(noQuestions)),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Frontend Developer (React)' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
