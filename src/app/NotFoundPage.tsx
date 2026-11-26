import { FormattedMessage, IntlProvider } from 'react-intl';
import { getBrowserLanguage, messages } from '@/app/messages';
import { Notice } from '@/components/Notice';
import { Page } from '@/components/Page';

/** A path that names no job. There's no job to take the language from, so it uses the browser's. */
export function NotFoundPage() {
  const locale = getBrowserLanguage();
  return (
    <IntlProvider locale={locale} messages={messages[locale]} defaultLocale="en">
      <Page>
        <JobNotFound />
      </Page>
    </IntlProvider>
  );
}

export function JobNotFound() {
  return (
    <Notice
      title={<FormattedMessage id="job.notFound.title" />}
      description={<FormattedMessage id="job.notFound.body" />}
    />
  );
}
