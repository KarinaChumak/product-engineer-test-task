import { UserRound } from 'lucide-react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { QuestionProps } from '@/app/questions/types';
import { NumberField } from '@/components/NumberField';
import { Tag } from '@/components/Tag';
import type { NumericQuestion as NumericQuestionData } from '@/shared/questionnaire';

export function NumericQuestion({
  question,
  value,
  onChange,
  fromProfile,
}: QuestionProps<NumericQuestionData>) {
  const intl = useIntl();
  return (
    <NumberField
      label={question.question}
      value={typeof value === 'number' ? value : undefined}
      onValueChange={onChange}
      locale={intl.locale}
      required={question.required}
      annotation={
        fromProfile && (
          <Tag icon={<UserRound aria-hidden="true" />}>
            <FormattedMessage id="question.fromProfile" />
          </Tag>
        )
      }
    />
  );
}
