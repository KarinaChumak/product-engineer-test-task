import type { UseQueryResult } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { useParams } from 'react-router';
import { NotFoundError } from '@/app/api';
import { getBrowserLanguage, messages } from '@/app/messages';
import { JobNotFound, NotFoundPage } from '@/app/NotFoundPage';
import { useJobQuestionnaire } from '@/app/useJobQuestionnaire';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { Page } from '@/components/Page';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
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
      <Page>
        <QuestionnaireContent query={query} />
      </Page>
    </IntlProvider>
  );
}

function QuestionnaireContent({ query }: { query: UseQueryResult<JobQuestionnaire> }) {
  // After a failure, "Try again" shows the loading state until the refetch settles.
  if (query.isPending || (query.isError && query.isFetching)) {
    return <Skeleton label={<FormattedMessage id="job.loading" />} />;
  }
  if (query.isError) {
    if (query.error instanceof NotFoundError) return <JobNotFound />;
    // fetch rejects with a TypeError when the server can't be reached at all.
    const reason = query.error instanceof TypeError ? 'job.error.network' : 'job.error.server';
    return (
      <Notice
        role="alert"
        title={<FormattedMessage id="job.error.title" />}
        description={<FormattedMessage id={reason} />}
        action={
          <Button onClick={() => void query.refetch()}>
            <FormattedMessage id="job.error.retry" />
          </Button>
        }
      />
    );
  }
  return (
    <>
      <PageHeader eyebrow={query.data.company} title={query.data.title} />
      {query.data.questions.length === 0 && (
        <EmptyState icon={<ClipboardList aria-hidden="true" />}>
          <FormattedMessage id="job.noQuestions" />
        </EmptyState>
      )}
    </>
  );
}
