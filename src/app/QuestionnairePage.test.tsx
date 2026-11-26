import { screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { QuestionnairePage } from '@/app/QuestionnairePage';
import { render } from '@/test/render';
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
    render(<QuestionnairePage jobId="job-short" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading the job…');
  });

  it('shows the title and company of the job it asked for', async () => {
    server.use(http.get('/api/jobs/job-short/questionnaire', () => HttpResponse.json(noQuestions)));
    render(<QuestionnairePage jobId="job-short" />);

    expect(await screen.findByRole('heading', { name: 'Frontend Developer (React)' })).toBeInTheDocument();
    expect(screen.getByText('Kranich Health GmbH')).toBeInTheDocument();
  });

  it('shows a job-not-found state for an unknown job', async () => {
    server.use(http.get(anyJob, () => HttpResponse.json({ error: 'not_found' }, { status: 404 })));
    render(<QuestionnairePage jobId="job-missing" />);

    expect(await screen.findByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
  });

  it('shows an error when the questionnaire cannot be loaded', async () => {
    server.use(http.get(anyJob, () => HttpResponse.json({ error: 'internal' }, { status: 500 })));
    render(<QuestionnairePage jobId="job-short" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load this job');
  });
});
