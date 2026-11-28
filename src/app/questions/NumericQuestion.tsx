import { useIntl } from 'react-intl';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { NumberField } from '@/components/NumberField';
import type { NumericQuestion as NumericQuestionData } from '@/shared/questionnaire';

export function NumericQuestion({
  question,
  value,
  onChange,
  onBlur,
  fromProfile,
  error,
}: QuestionProps<NumericQuestionData>) {
  const intl = useIntl();
  return (
    <NumberField
      label={question.question}
      value={typeof value === 'number' ? value : undefined}
      onValueChange={onChange}
      locale={intl.locale}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={error}
      onBlur={onBlur}
    />
  );
}
