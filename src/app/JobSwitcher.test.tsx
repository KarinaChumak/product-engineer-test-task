import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { jobListHandler } from '@/test/jobs';
import { renderAt } from '@/test/render';
import { server } from '@/test/server';

function serveQuestionnaires() {
  server.use(
    http.get('/api/jobs/:id/questionnaire', ({ params }) =>
      HttpResponse.json({
        id: params.id,
        title: `Title of ${String(params.id)}`,
        company: 'Acme',
        language: 'en',
        questions: [],
      }),
    ),
  );
}

describe('JobSwitcher', () => {
  it('shows the job on screen as the selected one', async () => {
    server.use(jobListHandler());
    serveQuestionnaires();
    renderAt('/jobs/job-short');

    const nav = await screen.findByRole('navigation', { name: 'Jobs' });
    expect(within(nav).getByRole('combobox', { name: 'Switch job' })).toHaveTextContent(
      'Frontend Developer (React) · Kranich Health GmbH',
    );
  });

  it('opens the job the candidate picks', async () => {
    const user = userEvent.setup();
    server.use(jobListHandler());
    serveQuestionnaires();
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox', { name: 'Switch job' }));
    await user.click(
      screen.getByRole('option', { name: 'Senior Frontend Engineer · Nordlicht Software GmbH' }),
    );

    expect(await screen.findByRole('heading', { name: 'Title of job-long' })).toBeInTheDocument();
  });

  it('does not carry an answer over to the job the candidate switches to', async () => {
    const user = userEvent.setup();
    server.use(
      jobListHandler(),
      http.get('/api/jobs/:id/questionnaire', ({ params }) =>
        HttpResponse.json({
          id: params.id,
          title: `Title of ${String(params.id)}`,
          company: 'Acme',
          language: 'en',
          questions: [
            {
              type: 'select',
              id: 'notice_period',
              question: 'What is your notice period?',
              required: true,
              maxChoices: 1,
              options: [
                { label: '1 month', value: '1_month' },
                { label: '3 months', value: '3_months' },
              ],
              prefill: '3_months',
            },
          ],
        }),
      ),
    );
    renderAt('/jobs/job-short');
    const switchTo = async (option: string) => {
      await user.click(await screen.findByRole('combobox', { name: 'Switch job' }));
      await user.click(screen.getByRole('option', { name: option }));
    };
    const noticePeriod = { name: 'What is your notice period?' };

    // Load both jobs once, so switching back and forth shows them straight from the cache.
    await screen.findByRole('heading', { name: 'Title of job-short' });
    await switchTo('Senior Frontend Engineer · Nordlicht Software GmbH');
    await screen.findByRole('heading', { name: 'Title of job-long' });
    await switchTo('Frontend Developer (React) · Kranich Health GmbH');
    await screen.findByRole('heading', { name: 'Title of job-short' });

    await user.click(screen.getByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));
    await switchTo('Senior Frontend Engineer · Nordlicht Software GmbH');
    await screen.findByRole('heading', { name: 'Title of job-long' });

    expect(screen.getByRole('combobox', noticePeriod)).toHaveTextContent('3 months');
  });

  it('can be opened and used by keyboard', async () => {
    const user = userEvent.setup();
    server.use(jobListHandler());
    serveQuestionnaires();
    renderAt('/jobs/job-short');

    (await screen.findByRole('combobox', { name: 'Switch job' })).focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowUp}{Enter}');

    expect(await screen.findByRole('heading', { name: 'Title of job-long' })).toBeInTheDocument();
  });

  it('asks to choose a job on a page that names no job', async () => {
    server.use(jobListHandler());
    renderAt('/settings');

    expect(await screen.findByRole('combobox', { name: 'Switch job' })).toHaveTextContent('Choose a job');
  });

  it('is left out when the list of jobs fails to load, and the job still shows', async () => {
    server.use(http.get('/api/jobs', () => new HttpResponse(null, { status: 500 })));
    serveQuestionnaires();
    renderAt('/jobs/job-short');

    expect(await screen.findByRole('heading', { name: 'Title of job-short' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Jobs' })).not.toBeInTheDocument();
  });
});
