import { useIntl } from 'react-intl';
import type { QuestionProps } from '@/app/questions/types';
import { Select } from '@/components/Select';
import type { SelectQuestion as SelectQuestionData } from '@/shared/questionnaire';

export function SelectQuestion({ question, value, onChange }: QuestionProps<SelectQuestionData>) {
  const intl = useIntl();
  return (
    <Select
      label={question.question}
      options={question.options}
      value={typeof value === 'string' ? value : undefined}
      onValueChange={onChange}
      placeholder={intl.formatMessage({ id: 'question.placeholder' })}
      required={question.required}
    />
  );
}
