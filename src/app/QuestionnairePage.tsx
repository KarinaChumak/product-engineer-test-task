import type { UseQueryResult } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { useParams } from 'react-router';
import { NotFoundError } from '@/app/api';
import { getBrowserLanguage, messages } from '@/app/messages';
import { JobNotFound, NotFoundPage } from '@/app/NotFoundPage';
import { getQuestionComponent } from '@/app/questionComponents';
import { useJobQuestionnaire } from '@/app/useJobQuestionnaire';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
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
      <Page>
        <QuestionnaireContent query={query} />
      </Page>
    </IntlProvider>
  );
}

function QuestionnaireContent({ query }: { query: UseQueryResult<JobQuestionnaire> }) {
  // A failed query that refetches goes back to pending, so a failure before means it's retrying.
  const failedBefore = query.errorUpdatedAt > 0;
  if (query.isPending && !failedBefore) return <Skeleton label={<FormattedMessage id="job.loading" />} />;
  if (query.isError || query.isPending) {
    if (query.error instanceof NotFoundError) return <JobNotFound />;
    return <LoadError error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />;
  }
  return <QuestionList questionnaire={query.data} />;
}

function QuestionList({ questionnaire }: { questionnaire: JobQuestionnaire }) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const shown = questionnaire.questions.flatMap((question) => {
    const Component = getQuestionComponent(question);
    return Component ? [{ question, Component }] : [];
  });

  return (
    <>
      <PageHeader eyebrow={questionnaire.company} title={questionnaire.title} />
      {shown.length === 0 ? (
        <EmptyState icon={<ClipboardList aria-hidden="true" />}>
          <FormattedMessage id="job.noQuestions" />
        </EmptyState>
      ) : (
        <Stack gap={6}>
          {shown.map(({ question, Component }) => (
            <Component
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))}
            />
          ))}
        </Stack>
      )}
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
