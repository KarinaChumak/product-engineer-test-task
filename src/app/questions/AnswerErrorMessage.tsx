import { FormattedMessage, useIntl } from 'react-intl';
import type { MessageKey } from '@/app/messages/en';
import { maxTextAnswerLength, type AnswerError } from '@/shared/prequalification';
import type { ClientQuestion } from '@/shared/questionnaire';

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
  const id: MessageKey = `answerError.${error}`;
  return (
    <FormattedMessage
      id={id}
      values={{
        min: question.type === 'numeric' ? intl.formatNumber(question.min) : undefined,
        max: question.type === 'numeric' ? intl.formatNumber(question.max) : undefined,
        maxChoices: question.type === 'select' ? question.maxChoices : undefined,
        maxLength: intl.formatNumber(maxTextAnswerLength),
      }}
    />
  );
}
