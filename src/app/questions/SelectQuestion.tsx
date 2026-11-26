import { UserRound } from 'lucide-react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { QuestionProps } from '@/app/questions/types';
import { Select } from '@/components/Select';
import { Tag } from '@/components/Tag';
import type { SelectQuestion as SelectQuestionData } from '@/shared/questionnaire';

export function SelectQuestion({
  question,
  value,
  onChange,
  fromProfile,
}: QuestionProps<SelectQuestionData>) {
  const intl = useIntl();
  return (
    <Select
      label={question.question}
      options={question.options}
      value={typeof value === 'string' ? value : undefined}
      onValueChange={onChange}
      placeholder={intl.formatMessage({ id: 'question.placeholder' })}
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
