import type { UseQueryResult } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { useParams } from 'react-router';
import { NotFoundError } from '@/app/api';
import { JobSwitcher } from '@/app/JobSwitcher';
import { getBrowserLanguage, messages } from '@/app/messages';
import { JobNotFound, NotFoundPage } from '@/app/NotFoundPage';
import { getQuestionComponent } from '@/app/questionComponents';
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
  const submission = useSubmitPrequalification(questionnaire.id);
  const shown = questionnaire.questions.flatMap((question) => {
    const Component = getQuestionComponent(question);
    if (!Component) return [];
    const value = Object.hasOwn(changed, question.id) ? changed[question.id] : question.prefill;
    return [{ question, Component, value }];
  });

  // The same screen whatever the screening found: the response doesn't say, and nor does this. It never
  // says the answers were sent to the employer: they go on only if the candidate passes.
  if (submission.isSuccess) {
    return (
      <Notice
        role="status"
        title={<FormattedMessage id="prequalification.recorded.title" />}
        description={
          <FormattedMessage
            id="prequalification.recorded.body"
            values={{ title: questionnaire.title, company: questionnaire.company }}
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
    submission.mutate({ answers });
  };

  return (
    <>
      <PageHeader eyebrow={questionnaire.company} title={questionnaire.title} />
      <Form label={questionnaire.title} onSubmit={submitAnswers}>
        {shown.length === 0 ? (
          <EmptyState icon={<ClipboardList aria-hidden="true" />}>
            <FormattedMessage id="job.noQuestions" />
          </EmptyState>
        ) : (
          <Stack gap={6}>
            {shown.map(({ question, Component, value }) => (
              <Component
                key={question.id}
                question={question}
                value={value}
                onChange={(next) => setChanged((answers) => ({ ...answers, [question.id]: next }))}
                fromProfile={question.prefill !== undefined && value === question.prefill}
              />
            ))}
          </Stack>
        )}
        <Stack gap={4}>
          {submission.isError && (
            <Alert>
              <FormattedMessage
                // fetch rejects with a TypeError when the server can't be reached at all.
                id={
                  submission.error instanceof TypeError
                    ? 'prequalification.error.network'
                    : 'prequalification.error.server'
                }
              />
            </Alert>
          )}
          {/* aria-disabled, not disabled, so the button keeps focus while the answers are submitted. */}
          <Button type="submit" aria-disabled={submission.isPending}>
            <FormattedMessage
              id={submission.isPending ? 'prequalification.submitting' : 'prequalification.submit'}
            />
          </Button>
        </Stack>
      </Form>
    </>
  );
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
