import { useIntl } from 'react-intl';
import { AnswerErrorMessage } from '@/app/questions/AnswerErrorMessage';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { Select } from '@/components/Select';
import type { SelectQuestion as SelectQuestionData } from '@/shared/questionnaire';

export function SelectQuestion({
  question,
  value,
  onChange,
  fromProfile,
  error,
}: QuestionProps<SelectQuestionData>) {
  const intl = useIntl();
  // A multi-choice answer is a list, even while this offers one pick until a multi-select exists.
  const isMultiChoice = question.maxChoices > 1;
  const choice = Array.isArray(value) ? value[0] : value;
  return (
    <Select
      label={question.question}
      options={question.options}
      value={typeof choice === 'string' ? choice : undefined}
      onValueChange={(next) => onChange(isMultiChoice ? [next] : next)}
      placeholder={intl.formatMessage({ id: 'question.placeholder' })}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={error && <AnswerErrorMessage question={question} error={error} />}
    />
  );
}
