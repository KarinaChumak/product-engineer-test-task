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

const questionnaire: JobQuestionnaire = {
  ...noQuestions,
  questions: [
    {
      type: 'select',
      id: 'notice_period',
      question: 'What is your notice period?',
      required: true,
      maxChoices: 1,
      options: [
        { label: 'Immediately', value: 'immediately' },
        { label: '1 month', value: '1_month' },
        { label: '3 months', value: '3_months' },
      ],
    },
    {
      type: 'numeric',
      id: 'salary',
      question: 'What is your salary expectation?',
      required: true,
      min: 0,
      max: 1,
    },
    {
      type: 'text',
      id: 'project',
      question: 'Which project are you proud of?',
      required: false,
      multiline: true,
    },
  ],
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

  it('shows the notice-period select with its options as written', async () => {
    const user = userEvent.setup();
    server.use(http.get(anyJob, () => HttpResponse.json(questionnaire)));
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox', { name: 'What is your notice period?' }));

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Immediately',
      '1 month',
      '3 months',
    ]);
  });

  it('keeps the option the candidate picks', async () => {
    const user = userEvent.setup();
    server.use(http.get(anyJob, () => HttpResponse.json(questionnaire)));
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '1 month' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('1 month');
  });

  it('does not render question types that are not supported yet', async () => {
    server.use(http.get(anyJob, () => HttpResponse.json(questionnaire)));
    renderAt('/jobs/job-short');

    await screen.findByRole('combobox');
    expect(screen.queryByText('What is your salary expectation?')).not.toBeInTheDocument();
    expect(screen.queryByText('Which project are you proud of?')).not.toBeInTheDocument();
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
