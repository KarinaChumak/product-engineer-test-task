import type { UseQueryResult } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { useParams } from 'react-router';
import { InvalidAnswersError, NotFoundError } from '@/app/api';
import { JobSwitcher } from '@/app/JobSwitcher';
import { getBrowserLanguage, messages } from '@/app/messages';
import type { MessageKey } from '@/app/messages/en';
import { JobNotFound, NotFoundPage } from '@/app/NotFoundPage';
import { getQuestionComponent } from '@/app/questionComponents';
import { AnswerErrorMessage } from '@/app/questions/AnswerErrorMessage';
import { useJobQuestionnaire } from '@/app/useJobQuestionnaire';
import { useSubmitPrequalification } from '@/app/useSubmitPrequalification';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Form } from '@/components/Form';
import { Notice } from '@/components/Notice';
import { Page } from '@/components/Page';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { Stack } from '@/components/Stack';
import { findInvalidAnswers } from '@/shared/answerValidation';
import type { AnswerError } from '@/shared/prequalification';
import type { AnswerValue, JobQuestionnaire } from '@/shared/questionnaire';

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
  // Only the answers the candidate changed; the rest fall back to the profile prefill. A cleared
  // answer stays in here as undefined, so it doesn't fall back.
  const [changed, setChanged] = useState<Record<string, AnswerValue | undefined>>({});
  // The refused answers, from the last submit's check or the server; changing an answer drops its error.
  const [answerErrors, setAnswerErrors] = useState<Partial<Record<string, AnswerError>>>({});
  const [invalidFocusRequest, setInvalidFocusRequest] = useState(0);
  const submission = useSubmitPrequalification(questionnaire.id);
  const shown = questionnaire.questions.flatMap((question) => {
    const Component = getQuestionComponent(question);
    if (!Component) return [];
    const value = Object.hasOwn(changed, question.id) ? changed[question.id] : question.prefill;
    return [{ question, Component, value, error: answerErrors[question.id] }];
  });

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

  const submitAnswers = () => {
    if (submission.isPending) return;
    const answers = Object.fromEntries(
      shown.flatMap(({ question, value }) => (value === undefined ? [] : [[question.id, value]])),
    );
    const showAnswerErrors = (errors: Record<string, AnswerError>) => {
      setAnswerErrors(errors);
      setInvalidFocusRequest((request) => request + 1);
    };
    // The same check the server runs, so most refusals show without a round trip.
    const errors = findInvalidAnswers(
      shown.map(({ question }) => question),
      { answers },
    );
    if (Object.keys(errors).length > 0) {
      // Nothing is sent, so an earlier send's error no longer applies.
      submission.reset();
      showAnswerErrors(errors);
      return;
    }
    setAnswerErrors({});
    submission.mutate(
      { answers },
      {
        onError: (error) => {
          if (error instanceof InvalidAnswersError) showAnswerErrors(error.fields);
        },
      },
    );
  };

  return (
    <>
      <PageHeader eyebrow={questionnaire.company} title={questionnaire.title} />
      <Form label={questionnaire.title} onSubmit={submitAnswers} invalidFocusRequest={invalidFocusRequest}>
        {shown.length === 0 ? (
          <EmptyState icon={<ClipboardList aria-hidden="true" />}>
            <FormattedMessage id="job.noQuestions" />
          </EmptyState>
        ) : (
          <Stack gap={6}>
            {shown.map(({ question, Component, value, error }) => (
              <Component
                key={question.id}
                question={question}
                value={value}
                onChange={(next) => {
                  setChanged((answers) => ({ ...answers, [question.id]: next }));
                  setAnswerErrors((errors) =>
                    errors[question.id] ? { ...errors, [question.id]: undefined } : errors,
                  );
                }}
                fromProfile={question.prefill !== undefined && value === question.prefill}
                error={error && <AnswerErrorMessage question={question} error={error} />}
              />
            ))}
          </Stack>
        )}
        <Stack gap={4}>
          {submission.isError && (
            <Alert>
              <FormattedMessage id={getSubmissionErrorMessage(submission.error)} />
            </Alert>
          )}
          <Button type="submit" isLoading={submission.isPending}>
            <FormattedMessage id="prequalification.submit" />
          </Button>
        </Stack>
      </Form>
    </>
  );
}

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
