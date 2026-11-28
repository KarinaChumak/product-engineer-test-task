import type { UseQueryResult } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { useParams } from 'react-router';
import { AlreadyCompletedError, InvalidAnswersError, NotFoundError } from '@/app/api';
import { JobSwitcher } from '@/app/JobSwitcher';
import { getBrowserLanguage, messages } from '@/app/messages';
import type { MessageKey } from '@/app/messages/en';
import { JobNotFound, NotFoundPage } from '@/app/NotFoundPage';
import { getQuestionComponent } from '@/app/questionComponents';
import { AnswerErrorMessage } from '@/app/questions/AnswerErrorMessage';
import { type QuestionStepName, splitIntoSteps } from '@/app/questions/splitIntoSteps';
import { useJobQuestionnaire } from '@/app/useJobQuestionnaire';
import { useQuestionnaireAnswers } from '@/app/useQuestionnaireAnswers';
import { useSubmitPrequalification } from '@/app/useSubmitPrequalification';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { ButtonGroup } from '@/components/ButtonGroup';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Form } from '@/components/Form';
import { Notice } from '@/components/Notice';
import { Page } from '@/components/Page';
import { PageHeader } from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import type { JobQuestionnaire } from '@/shared/questionnaire';

/** The page at `/jobs/:jobId`: the questionnaire of that job. */
export function QuestionnairePage() {
  const { jobId } = useParams();
  return jobId ? <QuestionnaireView jobId={jobId} /> : <NotFoundPage />;
}

function QuestionnaireView({ jobId }: { jobId: string }) {
  const query = useJobQuestionnaire(jobId);
  // Until the questionnaire arrives its language is unknown. The loading state shows no visible text,
  // so the browser language only reaches the screen in the not-found and error states.
  const locale = query.data?.language ?? getBrowserLanguage();

  return (
    <IntlProvider locale={locale} messages={messages[locale]} defaultLocale="en">
      <JobSwitcher currentJobId={jobId} />
      <Page>
        <Card>
          {/* Keyed by job, so switching jobs starts from fresh answers, while the switcher above keeps focus. */}
          <QuestionnaireContent key={jobId} query={query} />
        </Card>
      </Page>
    </IntlProvider>
  );
}

function QuestionnaireContent({ query }: { query: UseQueryResult<JobQuestionnaire> }) {
  // Once loaded, the questionnaire stays: a failed background reload keeps the last one and the answers.
  if (query.data) return <QuestionList questionnaire={query.data} />;
  // A failed query that refetches goes back to pending, so a failure before means it's retrying.
  const failedBefore = query.errorUpdatedAt > 0;
  if (query.isPending && !failedBefore) return <Skeleton label={<FormattedMessage id="job.loading" />} />;
  if (query.error instanceof NotFoundError) return <JobNotFound />;
  return <LoadError error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />;
}

function QuestionList({ questionnaire }: { questionnaire: JobQuestionnaire }) {
  // Only the questions this page can render are answered, split into steps.
  const questions = questionnaire.questions.filter((question) => getQuestionComponent(question));
  const steps = splitIntoSteps(questions);
  const { answers, invalidAnswers, getAnswer, getShownError, setAnswer, showErrors, setServerErrors } =
    useQuestionnaireAnswers(questions);
  const [stepIndex, setStepIndex] = useState(0);
  const [invalidFocusRequest, setInvalidFocusRequest] = useState(0);
  const submission = useSubmitPrequalification(questionnaire.id);

  // The candidate learns whether their answers go on to the employer, never which one decided it.
  if (submission.isSuccess) {
    const { passed } = submission.data;
    const job = { title: questionnaire.title, company: questionnaire.company };
    return (
      <Notice
        role="status"
        title={
          <FormattedMessage
            id={passed ? 'prequalification.passed.title' : 'prequalification.notPassed.title'}
            values={job}
          />
        }
        description={
          <FormattedMessage
            id={passed ? 'prequalification.passed.body' : 'prequalification.notPassed.body'}
            values={job}
          />
        }
      />
    );
  }

  // After the result above, so the background reload that follows a submit doesn't replace it. The screen
  // never says whether the candidate passed.
  if (questionnaire.isCompleted || submission.error instanceof AlreadyCompletedError) {
    const job = { title: questionnaire.title, company: questionnaire.company };
    return (
      <Notice
        role="status"
        title={<FormattedMessage id="prequalification.completed.title" />}
        description={<FormattedMessage id="prequalification.completed.body" values={job} />}
      />
    );
  }

  // A background reload can leave fewer steps than before.
  const currentIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
  const step = steps[currentIndex];

  // No step means nothing to answer, so nothing to send either.
  if (!step) {
    return (
      <>
        <PageHeader eyebrow={questionnaire.company} title={questionnaire.title} />
        <EmptyState
          icon={<ClipboardList aria-hidden="true" />}
          title={<FormattedMessage id="job.noQuestions.title" />}
        >
          <FormattedMessage id="job.noQuestions.body" />
        </EmptyState>
      </>
    );
  }

  const isLastStep = currentIndex === steps.length - 1;

  // Opens the earliest step with one of these answers, and focuses the first refused field there.
  const showFirstRefusedAnswer = (refusedIds: string[]) => {
    const index = steps.findIndex((step) => step.questions.some(({ id }) => refusedIds.includes(id)));
    if (index !== -1) setStepIndex(index);
    setInvalidFocusRequest((request) => request + 1);
  };

  // Next checks this step's answers only, and moves on once they're all valid.
  const goToNextStep = () => {
    const stepIds = step.questions.map(({ id }) => id);
    showErrors(stepIds);
    if (stepIds.some((id) => invalidAnswers[id])) {
      setInvalidFocusRequest((request) => request + 1);
      return;
    }
    setStepIndex(currentIndex + 1);
  };

  const submitAnswers = () => {
    if (submission.isPending) return;
    showErrors(questions.map(({ id }) => id));
    // Most refusals show without a round trip.
    const invalidIds = Object.keys(invalidAnswers);
    if (invalidIds.length > 0) {
      // Nothing is sent, so an earlier send's error no longer applies.
      submission.reset();
      showFirstRefusedAnswer(invalidIds);
      return;
    }
    setServerErrors({});
    submission.mutate(
      { answers },
      {
        onError: (error) => {
          if (!(error instanceof InvalidAnswersError)) return;
          setServerErrors(error.fields);
          showFirstRefusedAnswer(Object.keys(error.fields));
        },
      },
    );
  };

  return (
    <>
      <PageHeader eyebrow={questionnaire.company} title={questionnaire.title} />
      <Form
        label={questionnaire.title}
        onSubmit={isLastStep ? submitAnswers : goToNextStep}
        invalidFocusRequest={invalidFocusRequest}
      >
        <SectionHeader
          eyebrow={
            <FormattedMessage
              id="step.position"
              values={{ current: currentIndex + 1, total: steps.length }}
            />
          }
          title={<FormattedMessage id={stepTitles[step.name]} />}
        />
        <Stack gap={6}>
          {step.questions.map((question) => {
            const Component = getQuestionComponent(question);
            if (!Component) return null;
            const value = getAnswer(question);
            const error = getShownError(question);
            return (
              <Component
                key={question.id}
                question={question}
                value={value}
                onChange={(next) => setAnswer(question, next)}
                onBlur={() => showErrors([question.id])}
                fromProfile={question.prefill !== undefined && value === question.prefill}
                error={error && <AnswerErrorMessage question={question} error={error} />}
              />
            );
          })}
        </Stack>
        <Stack gap={4}>
          {/* On every step, since a 422 opens the step with the first refused answer. */}
          {submission.isError && (
            <Alert>
              <FormattedMessage id={getSubmissionErrorMessage(submission.error)} />
            </Alert>
          )}
          <ButtonGroup>
            {currentIndex > 0 && (
              <Button variant="secondary" onClick={() => setStepIndex(currentIndex - 1)}>
                <FormattedMessage id="step.back" />
              </Button>
            )}
            <Button type="submit" isLoading={isLastStep && submission.isPending}>
              <FormattedMessage id={isLastStep ? 'prequalification.submit' : 'step.next'} />
            </Button>
          </ButtonGroup>
        </Stack>
      </Form>
    </>
  );
}

const stepTitles: Record<QuestionStepName, MessageKey> = {
  fromProfile: 'step.fromProfile',
  quickAnswers: 'step.quickAnswers',
  ownWords: 'step.ownWords',
};

function getSubmissionErrorMessage(error: Error): MessageKey {
  if (error instanceof InvalidAnswersError) return 'prequalification.error.invalid';
  // fetch rejects with a TypeError when the server can't be reached at all.
  if (error instanceof TypeError) return 'prequalification.error.network';
  return 'prequalification.error.server';
}

interface LoadErrorProps {
  /** `null` while retrying: React Query clears the error, so the last one stays on screen. */
  error: Error | null;
  retrying: boolean;
  onRetry: () => void;
}

function LoadError({ error, retrying, onRetry }: LoadErrorProps) {
  const [shown, setShown] = useState(error);
  if (error && error !== shown) setShown(error);
  // fetch rejects with a TypeError when the server can't be reached at all.
  const reason = shown instanceof TypeError ? 'job.error.network' : 'job.error.server';

  return (
    <Notice
      role="alert"
      title={<FormattedMessage id="job.error.title" />}
      description={<FormattedMessage id={reason} />}
      action={
        // aria-disabled, not disabled, so the button keeps focus while it retries.
        <Button aria-disabled={retrying} onClick={() => !retrying && onRetry()}>
          <FormattedMessage id={retrying ? 'job.error.retrying' : 'job.error.retry'} />
        </Button>
      }
    />
  );
}
