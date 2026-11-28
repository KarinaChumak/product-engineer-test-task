import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { DateField } from '@/components/DateField';
import type { DateQuestion as DateQuestionData } from '@/shared/questionnaire';

export function DateQuestion({
  question,
  value,
  onChange,
  onBlur,
  fromProfile,
  error,
}: QuestionProps<DateQuestionData>) {
  return (
    <DateField
      label={question.question}
      value={typeof value === 'string' ? value : undefined}
      onValueChange={onChange}
      min={question.min}
      max={question.max}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={error}
      onBlur={onBlur}
    />
  );
}
