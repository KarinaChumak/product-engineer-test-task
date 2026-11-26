import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { jobListHandler } from '@/test/jobs';
import { renderAt } from '@/test/render';
import { server } from '@/test/server';
import type { JobQuestionnaire } from '@/shared/questionnaire';

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

const prefilledQuestionnaire: JobQuestionnaire = {
  ...questionnaire,
  questions: questionnaire.questions.map((question) =>
    question.id === 'notice_period' ? { ...question, prefill: '3_months' } : question,
  ),
};

// The page also has the job switcher's combobox, so the question's is found by its name.
const noticePeriod = { name: 'What is your notice period?' };

beforeEach(() => server.use(jobListHandler()));

describe('QuestionnairePage', () => {
  it('shows a loading state while the job loads', () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => delay('infinite')));
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
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(questionnaire)));
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
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(questionnaire)));
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));

    expect(screen.getByRole('combobox', noticePeriod)).toHaveTextContent('1 month');
  });

  it('marks the prefilled answer as from your profile, in English for an English job', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)));
    renderAt('/jobs/job-short');

    const select = await screen.findByRole('combobox', { name: 'What is your notice period?' });
    expect(select).toHaveTextContent('3 months');
    expect(select).toHaveAccessibleDescription('From your profile');
  });

  it('shows the UI copy in German for a German job', async () => {
    server.use(
      http.get('/api/jobs/:id/questionnaire', () =>
        HttpResponse.json({ ...prefilledQuestionnaire, language: 'de' }),
      ),
    );
    renderAt('/jobs/job-short');

    expect(await screen.findByRole('combobox', noticePeriod)).toHaveAccessibleDescription(
      'Aus deinem Profil',
    );
  });

  it('drops the profile mark when the candidate picks another option', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)));
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));

    expect(screen.getByRole('combobox', noticePeriod)).toHaveTextContent('1 month');
    expect(screen.queryByText('From your profile')).not.toBeInTheDocument();
  });

  it('marks the answer as from your profile again when the candidate picks the profile value back', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)));
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));
    await user.click(screen.getByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '3 months' }));

    expect(screen.getByRole('combobox', noticePeriod)).toHaveAccessibleDescription('From your profile');
  });

  it('does not render question types that are not supported yet', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(questionnaire)));
    renderAt('/jobs/job-short');

    await screen.findByRole('combobox', noticePeriod);
    expect(screen.queryByText('What is your salary expectation?')).not.toBeInTheDocument();
    expect(screen.queryByText('Which project are you proud of?')).not.toBeInTheDocument();
  });

  it('says so when the job has no questions to answer', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(noQuestions)));
    renderAt('/jobs/job-short');

    expect(await screen.findByText('This job has no questions for you to answer.')).toBeInTheDocument();
  });

  it('shows a job-not-found state for an unknown job', async () => {
    server.use(
      http.get('/api/jobs/:id/questionnaire', () =>
        HttpResponse.json({ error: 'not_found' }, { status: 404 }),
      ),
    );
    renderAt('/jobs/job-missing');

    expect(await screen.findByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
  });

  it('says the server had a problem when the job fails with a 500', async () => {
    server.use(
      http.get('/api/jobs/:id/questionnaire', () =>
        HttpResponse.json({ error: 'internal' }, { status: 500 }),
      ),
    );
    renderAt('/jobs/job-short');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load this job');
    expect(alert).toHaveTextContent('Our server ran into a problem.');
  });

  it('says the server could not be reached on a network error', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.error()));
    renderAt('/jobs/job-short');

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t reach the server.');
  });

  it('loads the job again on "Try again"', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(
        '/api/jobs/:id/questionnaire',
        () => HttpResponse.json({ error: 'internal' }, { status: 500 }),
        {
          once: true,
        },
      ),
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(noQuestions)),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Frontend Developer (React)' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps focus on the retry button while it loads the job again', async () => {
    const user = userEvent.setup();
    let respond = () => {};
    server.use(
      http.get(
        '/api/jobs/:id/questionnaire',
        () => HttpResponse.json({ error: 'internal' }, { status: 500 }),
        { once: true },
      ),
      http.get(
        '/api/jobs/:id/questionnaire',
        () => new Promise<Response>((resolve) => (respond = () => resolve(HttpResponse.json(noQuestions)))),
      ),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    const retrying = await screen.findByRole('button', { name: 'Trying again…' });
    expect(retrying).toHaveFocus();
    expect(retrying).toHaveAttribute('aria-disabled', 'true');
    respond();
    expect(await screen.findByRole('heading', { name: 'Frontend Developer (React)' })).toBeInTheDocument();
  });

  it('keeps the questionnaire and the picked answer when reloading it in the background fails', async () => {
    const user = userEvent.setup();
    let requests = 0;
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => {
        requests += 1;
        return requests === 1
          ? HttpResponse.json(questionnaire)
          : HttpResponse.json({ error: 'internal' }, { status: 500 });
      }),
    );
    renderAt('/jobs/job-short');
    await user.click(await screen.findByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));

    // Coming back to the tab reloads the questionnaire in the background.
    act(() => window.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(requests).toBe(2));
    // Let the failed response reach the page.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', noticePeriod)).toHaveTextContent('1 month');
  });
});
