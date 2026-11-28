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

/** A job with only job-long's `focus_areas`, which may pick `maxChoices` of its three options. */
const multiChoiceQuestionnaire = ({ maxChoices = 2, required = false } = {}): JobQuestionnaire => ({
  ...noQuestions,
  questions: [
    {
      type: 'select',
      id: 'focus_areas',
      question: 'Which areas would you like to focus on?',
      required,
      maxChoices,
      options: [
        { label: 'Frontend architecture', value: 'frontend' },
        { label: 'Design systems', value: 'design_systems' },
        { label: 'Performance', value: 'performance' },
      ],
    },
  ],
});
const focusAreas = { name: 'Which areas would you like to focus on?' };

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

  /** Opens job-short, prefilled by default, and answers the prequalification POST with `respond`, collecting the requests. */
  const openWithPrequalificationResponse = (
    respond: () => Response | Promise<Response>,
    opened: JobQuestionnaire = prefilledQuestionnaire,
  ) => {
    const sent: unknown[] = [];
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(opened)),
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

  it('sends the picks on a multi-choice question as a list, in the order of the options', async () => {
    const user = userEvent.setup();
    const sent = openWithPrequalificationResponse(passed, multiChoiceQuestionnaire());

    await user.click(await screen.findByRole('checkbox', { name: 'Performance' }));
    await user.click(screen.getByRole('checkbox', { name: 'Frontend architecture' }));
    await user.click(screen.getByRole('button', submitAnswers));
    await screen.findByRole('heading', answersSent);

    expect(sent).toEqual([{ answers: { focus_areas: ['frontend', 'performance'] } }]);
  });

  it('leaves an optional multi-choice question out of the answers once everything is unpicked', async () => {
    const user = userEvent.setup();
    const sent = openWithPrequalificationResponse(passed, multiChoiceQuestionnaire());

    await user.click(await screen.findByRole('checkbox', { name: 'Performance' }));
    await user.click(screen.getByRole('checkbox', { name: 'Performance' }));
    await user.click(screen.getByRole('button', submitAnswers));
    await screen.findByRole('heading', answersSent);

    expect(sent).toEqual([{ answers: {} }]);
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

  it('marks every empty required field with its error and moves focus to the first, without sending', async () => {
    const user = userEvent.setup();
    const sent = openWithPrequalificationResponse(passed, questionnaire);

    await user.click(await screen.findByRole('button', submitAnswers));

    const select = screen.getByRole('combobox', noticePeriod);
    const salary = screen.getByRole('textbox', salaryQuestion);
    for (const field of [select, salary]) {
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription('Answer this question to continue.');
    }
    expect(select).toHaveFocus();
    expect(screen.getByRole('textbox', { name: /proud of/ })).not.toHaveAttribute('aria-invalid');
    expect(sent).toEqual([]);
  });

  it('says which range a number must be in, without sending, when it is outside the field’s limits', async () => {
    const user = userEvent.setup();
    const sent = openWithPrequalificationResponse(passed);

    const salary = await screen.findByRole('textbox', salaryQuestion);
    await user.clear(salary);
    await user.type(salary, '500000');
    await user.click(screen.getByRole('button', submitAnswers));

    expect(salary).toHaveAttribute('aria-invalid', 'true');
    // The field's own limits, which the candidate sees anyway; nothing about what the employer wants.
    expect(salary).toHaveAccessibleDescription('Enter a number from 20,000 to 300,000.');
    expect(salary).toHaveFocus();
    expect(sent).toEqual([]);
  });

  it.each([
    [
      'a code the client has no message for',
      () => HttpResponse.json({ fields: { salary: 'made_up' } }, { status: 422 }),
    ],
    ['a body that is not JSON', () => new HttpResponse('<h1>Bad gateway</h1>', { status: 422 })],
  ])('shows only the alert for a 422 with %s', async (_, respond) => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(respond);

    await user.click(await screen.findByRole('button', submitAnswers));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Some of your answers can’t be accepted/);
    expect(screen.getByRole('textbox', salaryQuestion)).not.toHaveAttribute('aria-invalid');
  });

  it('shows the server’s field errors on their fields and moves focus to the first', async () => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(() =>
      HttpResponse.json(
        {
          error: 'invalid_answers',
          message: 'Invalid',
          fields: { salary: 'out_of_range', proud_project: 'too_long' },
        },
        { status: 422 },
      ),
    );

    await user.click(await screen.findByRole('button', submitAnswers));

    const salary = screen.getByRole('textbox', salaryQuestion);
    await waitFor(() => expect(salary).toHaveAttribute('aria-invalid', 'true'));
    expect(salary).toHaveAccessibleDescription(/^From your profile Enter a number from 20,000 to 300,000\.$/);
    expect(screen.getByRole('textbox', { name: /proud of/ })).toHaveAccessibleDescription(
      'Shorten your answer to 5,000 characters or fewer.',
    );
    expect(salary).toHaveFocus();
  });

  it('drops a field’s error once the candidate changes its answer', async () => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(passed, questionnaire);

    await user.click(await screen.findByRole('button', submitAnswers));
    await user.type(screen.getByRole('textbox', salaryQuestion), '95000');

    const salary = screen.getByRole('textbox', salaryQuestion);
    expect(salary).not.toHaveAttribute('aria-invalid');
    expect(salary).not.toHaveAccessibleDescription();
    expect(screen.getByRole('combobox', noticePeriod)).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the server’s error on a field the candidate leaves, until they change that answer', async () => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(() =>
      HttpResponse.json(
        { error: 'invalid_answers', message: 'Invalid', fields: { salary: 'out_of_range' } },
        { status: 422 },
      ),
    );

    await user.click(await screen.findByRole('button', submitAnswers));
    const salary = screen.getByRole('textbox', salaryQuestion);
    await waitFor(() => expect(salary).toHaveFocus());
    // The client's check accepts 95,000, so only the server's error is on the field.
    await user.tab();
    expect(salary).toHaveAccessibleDescription('From your profile Enter a number from 20,000 to 300,000.');

    await user.clear(salary);
    await user.type(salary, '96000');
    expect(salary).not.toHaveAttribute('aria-invalid');
  });

  it('shows the field errors in German for a German job', async () => {
    const user = userEvent.setup();
    openWithPrequalificationResponse(passed, { ...questionnaire, language: 'de' });

    await user.click(await screen.findByRole('button', { name: 'Antworten absenden' }));

    expect(screen.getByRole('combobox', noticePeriod)).toHaveAccessibleDescription(
      'Beantworte diese Frage, um fortzufahren.',
    );
  });
});

describe('QuestionnairePage errors on leaving a field', () => {
  const proudProject = { name: /proud of/ };
  const required = 'Answer this question to continue.';
  const outOfRange = 'Enter a number from 20,000 to 300,000.';

  /** Opens job-short with no prefills, collecting any prequalification POST, which none of these should send. */
  const openUnanswered = () => {
    const sent: unknown[] = [];
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(questionnaire)),
      http.post('/api/jobs/job-short/prequalification', async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({ passed: true }, { status: 201 });
      }),
    );
    renderAt('/jobs/job-short');
    return sent;
  };

  it('shows a field’s error when the candidate moves to another question, without submitting', async () => {
    const user = userEvent.setup();
    const sent = openUnanswered();

    const salary = await screen.findByRole('textbox', salaryQuestion);
    await user.type(salary, '5');
    await user.click(screen.getByRole('textbox', proudProject));

    expect(salary).toHaveAttribute('aria-invalid', 'true');
    expect(salary).toHaveAccessibleDescription(outOfRange);
    expect(sent).toEqual([]);
  });

  it('shows a field’s error when focus leaves the form', async () => {
    const user = userEvent.setup();
    openUnanswered();

    const salary = await screen.findByRole('textbox', salaryQuestion);
    await user.click(salary);
    await user.click(document.body);

    expect(salary).toHaveAccessibleDescription(required);
  });

  it('updates a shown error as the candidate types, and drops it once the answer is valid', async () => {
    const user = userEvent.setup();
    openUnanswered();

    const salary = await screen.findByRole('textbox', salaryQuestion);
    await user.type(salary, '5');
    await user.tab();
    expect(salary).toHaveAccessibleDescription(outOfRange);

    await user.clear(salary);
    expect(salary).toHaveAccessibleDescription(required);

    await user.type(salary, '95000');
    expect(salary).not.toHaveAttribute('aria-invalid');
    expect(salary).not.toHaveAccessibleDescription();
  });

  it('shows no error on questions the candidate hasn’t left until they submit, then shows every one and focuses the first', async () => {
    const user = userEvent.setup();
    openUnanswered();

    await user.click(await screen.findByRole('textbox', salaryQuestion));
    await user.tab();
    const select = screen.getByRole('combobox', noticePeriod);
    expect(select).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('textbox', salaryQuestion)).toHaveAttribute('aria-invalid', 'true');

    await user.click(screen.getByRole('button', { name: 'Submit answers' }));

    expect(select).toHaveAccessibleDescription(required);
    expect(select).toHaveFocus();
  });

  it('shows no error under a select while its list is open or after picking, only once the candidate leaves it', async () => {
    const user = userEvent.setup();
    openUnanswered();

    const select = await screen.findByRole('combobox', noticePeriod);
    await user.click(select);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(select).not.toHaveAttribute('aria-invalid');
    await user.keyboard('{Escape}');
    expect(select).toHaveFocus();
    expect(select).not.toHaveAttribute('aria-invalid');

    await user.tab();
    expect(select).toHaveAccessibleDescription(required);

    await user.click(select);
    await user.click(screen.getByRole('option', { name: '1 month' }));
    expect(select).not.toHaveAttribute('aria-invalid');
  });
});

describe('QuestionnairePage multi-choice question', () => {
  const openMultiChoice = (opened: JobQuestionnaire) => {
    server.use(http.get('/api/jobs/:id/questionnaire', () => HttpResponse.json(opened)));
    renderAt('/jobs/job-short');
  };

  it('shows the options as checkboxes grouped under the question, saying how many can be picked', async () => {
    openMultiChoice(multiChoiceQuestionnaire());

    const group = await screen.findByRole('group', focusAreas);
    expect(group).toHaveAccessibleDescription('Pick up to 2');
    expect(screen.getAllByRole('checkbox')).toEqual([
      screen.getByRole('checkbox', { name: 'Frontend architecture' }),
      screen.getByRole('checkbox', { name: 'Design systems' }),
      screen.getByRole('checkbox', { name: 'Performance' }),
    ]);
  });

  it('disables the other options once the most allowed are picked, until one is unpicked', async () => {
    const user = userEvent.setup();
    openMultiChoice(multiChoiceQuestionnaire());

    await user.click(await screen.findByRole('checkbox', { name: 'Frontend architecture' }));
    await user.click(screen.getByRole('checkbox', { name: 'Performance' }));
    expect(screen.getByRole('checkbox', { name: 'Design systems' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Performance' }));
    expect(screen.getByRole('checkbox', { name: 'Design systems' })).toBeEnabled();
  });

  it('lets every option be picked and shows no limit when the limit is at least the number of options', async () => {
    const user = userEvent.setup();
    openMultiChoice(multiChoiceQuestionnaire({ maxChoices: 5 }));

    for (const checkbox of await screen.findAllByRole('checkbox')) await user.click(checkbox);

    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeChecked();
    expect(screen.getByRole('group', focusAreas)).not.toHaveAccessibleDescription();
  });

  it('shows the required error once the candidate leaves the group without a pick, and drops it on a pick', async () => {
    const user = userEvent.setup();
    openMultiChoice(multiChoiceQuestionnaire({ required: true }));

    const group = await screen.findByRole('group', { name: `${focusAreas.name} required` });
    await user.click(screen.getByRole('checkbox', { name: 'Design systems' }));
    await user.click(screen.getByRole('checkbox', { name: 'Design systems' }));
    expect(group).toHaveAccessibleDescription('Pick up to 2');
    await user.tab();
    await user.tab();
    expect(group).toHaveAccessibleDescription('Pick up to 2 Answer this question to continue.');

    await user.click(screen.getByRole('checkbox', { name: 'Performance' }));
    expect(group).toHaveAccessibleDescription('Pick up to 2');
  });

  it('says how many can be picked, and that a group is required, in German for a German job', async () => {
    openMultiChoice({ ...multiChoiceQuestionnaire({ required: true }), language: 'de' });

    const group = await screen.findByRole('group', { name: `${focusAreas.name} Pflichtfeld` });
    expect(group).toHaveAccessibleDescription('Wähle bis zu 2 aus');
  });
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

  it('shows that the job is already completed when the server refuses a second submission, and reloads the job', async () => {
    const user = userEvent.setup();
    let loads = 0;
    server.use(
      http.get('/api/jobs/:id/questionnaire', () => {
        loads += 1;
        return HttpResponse.json(prefilledQuestionnaire);
      }),
      http.post('/api/jobs/job-short/prequalification', () =>
        HttpResponse.json({ error: 'already_completed' }, { status: 409 }),
      ),
    );
    renderAt('/jobs/job-short');

    await user.click(await screen.findByRole('button', { name: 'Submit answers' }));

    expect(await screen.findByRole('heading', completedHeading)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // So reopening the job later shows it as completed from the cache, too.
    await waitFor(() => expect(loads).toBe(2));
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
