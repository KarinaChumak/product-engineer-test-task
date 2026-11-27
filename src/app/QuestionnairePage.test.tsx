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
  isCompleted: false,
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
      min: 20000,
      max: 300000,
    },
    {
      type: 'text',
      id: 'proud_project',
      question: 'Which frontend project are you most proud of? 🚀🔥 Tell us what YOU built! 💪',
      required: false,
      multiline: true,
    },
  ],
};

const prefilledQuestionnaire: JobQuestionnaire = {
  ...questionnaire,
  questions: questionnaire.questions.map((question) => {
    if (question.id === 'notice_period') return { ...question, prefill: '3_months' };
    if (question.id === 'salary') return { ...question, prefill: 95000 };
    return question;
  }),
};

// The page also has the job switcher's combobox, so the question's is found by its name.
const noticePeriod = { name: 'What is your notice period?' };
const salaryQuestion = { name: 'What is your salary expectation?' };

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
    expect(screen.getByRole('combobox', noticePeriod)).not.toHaveAccessibleDescription();
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
    // A type the client has no component for yet, as a newer server could send it.
    const dateQuestion = { type: 'date', id: 'start_date', question: 'When can you start?', required: true };
    server.use(
      http.get('/api/jobs/:id/questionnaire', () =>
        HttpResponse.json({ ...questionnaire, questions: [...questionnaire.questions, dateQuestion] }),
      ),
    );
    renderAt('/jobs/job-short');

    await screen.findByRole('combobox', noticePeriod);
    expect(screen.queryByText('When can you start?')).not.toBeInTheDocument();
  });

  it('shows the free-text question exactly as the recruiter wrote it, emoji included, in a textarea', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(questionnaire)));
    renderAt('/jobs/job-short');

    const project = await screen.findByRole('textbox', {
      name: 'Which frontend project are you most proud of? 🚀🔥 Tell us what YOU built! 💪',
    });
    expect(project.tagName).toBe('TEXTAREA');
  });

  it('shows a single-line field for a text question that is not multiline', async () => {
    const singleLine: JobQuestionnaire = {
      ...noQuestions,
      questions: [
        { type: 'text', id: 'country', question: 'Country of residence', required: true, multiline: false },
      ],
    };
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(singleLine)));
    renderAt('/jobs/job-short');

    const country = await screen.findByRole('textbox', { name: 'Country of residence' });
    expect(country.tagName).toBe('INPUT');
  });

  it('answers the salary question in a number field grouped for the job language', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json({ ...questionnaire, language: 'de' })),
    );
    renderAt('/jobs/job-short');

    const salary = await screen.findByRole('textbox', salaryQuestion);
    await user.type(salary, '95000');

    expect(salary).toHaveValue('95.000');
  });

  it('shows the prefilled salary grouped and marked as from your profile', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)));
    renderAt('/jobs/job-short');

    const salary = await screen.findByRole('textbox', salaryQuestion);
    expect(salary).toHaveValue('95,000');
    expect(salary).toHaveAccessibleDescription('From your profile');
  });

  it('drops the profile mark when the candidate changes the prefilled salary', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)));
    renderAt('/jobs/job-short');

    await user.type(await screen.findByRole('textbox', salaryQuestion), '0');

    expect(screen.getByRole('textbox', salaryQuestion)).toHaveValue('950,000');
    expect(screen.getByRole('textbox', salaryQuestion)).not.toHaveAccessibleDescription();
  });

  it('leaves the salary empty when the candidate clears the prefilled amount', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)));
    renderAt('/jobs/job-short');

    await user.clear(await screen.findByRole('textbox', salaryQuestion));

    expect(screen.getByRole('textbox', salaryQuestion)).toHaveValue('');
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

describe('QuestionnairePage submit', () => {
  const submitAnswers = { name: 'Submit answers' };
  const answersSent = { name: 'Your answers have been sent to Kranich Health GmbH' };
  const passed = () => HttpResponse.json({ passed: true }, { status: 201 });

  /** Opens the prefilled job-short and answers the prequalification POST with `respond`, collecting the requests. */
  const openWithPrequalificationResponse = (respond: () => Response | Promise<Response>) => {
    const sent: unknown[] = [];
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)),
      http.post('/api/jobs/job-short/prequalification', async ({ request }) => {
        sent.push(await request.json());
        return respond();
      }),
    );
    renderAt('/jobs/job-short');
    return sent;
  };

  it('submits the prefilled and changed answers, leaving out an empty optional one, then says they were sent when the candidate passed', async () => {
    const user = userEvent.setup();
    const sent = openWithPrequalificationResponse(passed);

    await user.click(await screen.findByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));
    await user.click(screen.getByRole('button', submitAnswers));

    expect(await screen.findByRole('heading', answersSent)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'You fit what Kranich Health GmbH is looking for, so they now have your answers',
    );
    expect(sent).toEqual([{ answers: { notice_period: '1_month', salary: 95000 } }]);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('says the answers won’t be sent on, without naming a question, when the candidate did not pass', async () => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(() => HttpResponse.json({ passed: false }, { status: 201 }));

    await user.click(await screen.findByRole('button', submitAnswers));

    expect(
      await screen.findByRole('heading', { name: 'You don’t fit this job’s requirements' }),
    ).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('so we won’t send them on');
    expect(status).not.toHaveTextContent(/salary|notice|sent to/i);
  });

  it('sends the pick on a multi-choice question as a list of choices', async () => {
    const user = userEvent.setup();
    const sent: unknown[] = [];
    server.use(
      http.get('/api/jobs/:id/questionnaire', () =>
        HttpResponse.json({
          ...noQuestions,
          questions: [{ ...questionnaire.questions[0], id: 'focus', maxChoices: 2 }],
        }),
      ),
      http.post('/api/jobs/job-short/prequalification', async ({ request }) => {
        sent.push(await request.json());
        return passed();
      }),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('combobox', noticePeriod));
    await user.click(screen.getByRole('option', { name: '1 month' }));
    expect(screen.getByRole('combobox', noticePeriod)).toHaveTextContent('1 month');
    await user.click(screen.getByRole('button', submitAnswers));

    await screen.findByRole('heading', answersSent);
    expect(sent).toEqual([{ answers: { focus: ['1_month'] } }]);
  });

  it('never calls the answers an application, whether the candidate passed or not', async () => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(passed);

    await user.click(await screen.findByRole('button', submitAnswers));

    expect(await screen.findByRole('status')).not.toHaveTextContent(/application|applied/i);
  });

  it('says the answers were sent in German for a German job', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/jobs/:id/questionnaire', () =>
        HttpResponse.json({ ...prefilledQuestionnaire, language: 'de' }),
      ),
      http.post('/api/jobs/job-short/prequalification', passed),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Antworten absenden' }));

    expect(
      await screen.findByRole('heading', { name: 'Deine Antworten wurden an Kranich Health GmbH gesendet' }),
    ).toBeInTheDocument();
  });

  it('keeps the button label and shows it loading while the request is in flight, sending one request on a double click', async () => {
    const user = userEvent.setup();
    const sent = openWithPrequalificationResponse(() => delay('infinite').then(() => new HttpResponse(null)));

    await user.dblClick(await screen.findByRole('button', submitAnswers));

    const button = screen.getByRole('button', submitAnswers);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await user.click(button);
    expect(sent).toHaveLength(1);
    expect(screen.queryByRole('heading', answersSent)).not.toBeInTheDocument();
  });

  it.each([
    ['a 500', () => HttpResponse.json({ error: 'internal' }, { status: 500 }), /server ran into a problem/],
    [
      'a 422',
      () =>
        HttpResponse.json({ error: 'invalid_answers', fields: { salary: 'out_of_range' } }, { status: 422 }),
      /Some of your answers can’t be accepted/,
    ],
    ['a network error', () => HttpResponse.error(), /couldn’t reach the server/],
  ])(
    'keeps the form and its answers and shows an error above the button on %s',
    async (_, respond, message) => {
      const user = userEvent.setup();
      openWithPrequalificationResponse(respond);

      await user.click(await screen.findByRole('combobox', noticePeriod));
      await user.click(screen.getByRole('option', { name: '1 month' }));
      await user.click(screen.getByRole('button', submitAnswers));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(message);
      expect(alert.compareDocumentPosition(screen.getByRole('button', submitAnswers))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(screen.getByRole('combobox', noticePeriod)).toHaveTextContent('1 month');
      expect(screen.getByRole('textbox', salaryQuestion)).toHaveValue('95,000');
    },
  );
});

describe('QuestionnairePage already completed', () => {
  const completedHeading = { name: 'You’ve already answered the questions for this job' };
  const completed = { ...prefilledQuestionnaire, isCompleted: true };

  it('shows that the job is already completed instead of the form, without saying whether the candidate passed', async () => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(completed)));
    renderAt('/jobs/job-short');

    expect(await screen.findByRole('heading', completedHeading)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'You answered the questions for Frontend Developer (React) at Kranich Health GmbH.',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(/sent|fit|requirements|meet/i);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit answers' })).not.toBeInTheDocument();
  });

  it('says the job is already completed in German for a German job', async () => {
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json({ ...completed, language: 'de' })),
    );
    renderAt('/jobs/job-short');

    expect(
      await screen.findByRole('heading', { name: 'Du hast die Fragen zu diesem Job schon beantwortet' }),
    ).toBeInTheDocument();
  });

  it('shows that the job is already completed when the server refuses a second submission', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(prefilledQuestionnaire)),
      http.post('/api/jobs/job-short/prequalification', () =>
        HttpResponse.json({ error: 'already_completed' }, { status: 409 }),
      ),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Submit answers' }));

    expect(await screen.findByRole('heading', completedHeading)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the result on screen when the reload after submitting says the job is completed', async () => {
    const user = userEvent.setup();
    let isCompleted = false;
    let loads = 0;
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => {
        loads += 1;
        return HttpResponse.json({ ...prefilledQuestionnaire, isCompleted });
      }),
      http.post('/api/jobs/job-short/prequalification', () => {
        isCompleted = true;
        return HttpResponse.json({ passed: true }, { status: 201 });
      }),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Submit answers' }));

    const sent = { name: 'Your answers have been sent to Kranich Health GmbH' };
    expect(await screen.findByRole('heading', sent)).toBeInTheDocument();
    // The reload that marks the job completed has arrived, and the result is still there.
    await waitFor(() => expect(loads).toBe(2));
    await act(() => delay(50));
    expect(screen.getByRole('heading', sent)).toBeInTheDocument();
  });
});
