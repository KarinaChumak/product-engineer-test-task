import { FormattedMessage, useIntl } from 'react-intl';
import type { MessageKey } from '@/app/messages/en';
import { maxFileBytes, maxTextAnswerLength, type AnswerError } from '@/shared/prequalification';
import type { ClientQuestion } from '@/shared/questionnaire';

// Decimal, as the file field shows sizes, so the limit reads "5 MB".
const bytesPerMegabyte = 1_000_000;

interface AnswerErrorMessageProps {
  question: ClientQuestion;
  error: AnswerError;
}

/**
 * What the candidate should change about an answer the check refused. It names only the limits the field
 * itself shows, never a rule about which answers the employer wants.
 */
export function AnswerErrorMessage({ question, error }: AnswerErrorMessageProps) {
  const intl = useIntl();
  if (question.type === 'date' && error === 'out_of_range') {
    // In the UI locale, whatever format the browser's own date input shows.
    const formatDate = (date: string | undefined) =>
      date === undefined ? '' : intl.formatDate(`${date}T00:00:00`, { dateStyle: 'long' });
    const bounds = question.min && question.max ? 'both' : question.min ? 'min' : 'max';
    return (
      <FormattedMessage
        id="answerError.date_out_of_range"
        values={{ bounds, min: formatDate(question.min), max: formatDate(question.max) }}
      />
    );
  }
  const id: MessageKey = `answerError.${error}`;
  return (
    <FormattedMessage
      id={id}
      values={{
        min: question.type === 'numeric' ? intl.formatNumber(question.min) : undefined,
        max: question.type === 'numeric' ? intl.formatNumber(question.max) : undefined,
        maxChoices: question.type === 'select' ? question.maxChoices : undefined,
        maxLength: intl.formatNumber(maxTextAnswerLength),
        maxFileSize: intl.formatNumber(maxFileBytes / bytesPerMegabyte, { style: 'unit', unit: 'megabyte' }),
      }}
    />
  );
}
