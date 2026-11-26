import type { UseQueryResult } from '@tanstack/react-query';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { NotFoundError } from '@/app/api';
import { getBrowserLanguage, messages } from '@/app/messages';
import { useJobQuestionnaire } from '@/app/useJobQuestionnaire';
import { Notice } from '@/components/Notice';
import { Page } from '@/components/Page';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import type { JobQuestionnaire } from '@/shared/questionnaire';

export interface QuestionnairePageProps {
  jobId: string;
}

/** The questionnaire of one job. */
export function QuestionnairePage({ jobId }: QuestionnairePageProps) {
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
  if (query.isPending) return <Skeleton label={<FormattedMessage id="job.loading" />} />;
  if (query.error instanceof NotFoundError) {
    return (
      <Notice
        title={<FormattedMessage id="job.notFound.title" />}
        description={<FormattedMessage id="job.notFound.body" />}
      />
    );
  }
  if (query.isError) {
    return (
      <Notice
        role="alert"
        title={<FormattedMessage id="job.error.title" />}
        description={<FormattedMessage id="job.error.body" />}
      />
    );
  }
  return <PageHeader eyebrow={query.data.company} title={query.data.title} />;
}
