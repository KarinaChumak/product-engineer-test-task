import { useIntl } from 'react-intl';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { RadioGroup } from '@/components/RadioGroup';
import type { BooleanQuestion as BooleanQuestionData } from '@/shared/questionnaire';

/** A yes/no question as two radios. The answer is a JSON boolean, so the radio values map to true and false. */
export function BooleanQuestion({
  question,
  value,
  onChange,
  onBlur,
  fromProfile,
  error,
}: QuestionProps<BooleanQuestionData>) {
  const intl = useIntl();
  return (
    <RadioGroup
      label={question.question}
      options={[
        { label: intl.formatMessage({ id: 'question.yes' }), value: 'true' },
        { label: intl.formatMessage({ id: 'question.no' }), value: 'false' },
      ]}
      value={typeof value === 'boolean' ? String(value) : undefined}
      onValueChange={(next) => onChange(next === 'true')}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={error}
      onBlur={onBlur}
    />
  );
}
