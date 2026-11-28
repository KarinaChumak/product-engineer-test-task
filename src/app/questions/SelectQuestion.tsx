import { FormattedMessage, useIntl } from 'react-intl';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { CheckboxGroup } from '@/components/CheckboxGroup';
import { Select } from '@/components/Select';
import type { SelectQuestion as SelectQuestionData } from '@/shared/questionnaire';

/** A select question: one pick in a select, or, with `maxChoices` above 1, several in a checkbox group. */
export function SelectQuestion(props: QuestionProps<SelectQuestionData>) {
  return props.question.maxChoices > 1 ? (
    <MultiChoiceQuestion {...props} />
  ) : (
    <SingleChoiceQuestion {...props} />
  );
}

function SingleChoiceQuestion({
  question,
  value,
  onChange,
  onBlur,
  fromProfile,
  error,
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
      annotation={fromProfile && <FromProfileTag />}
      error={error}
      onBlur={onBlur}
    />
  );
}

function MultiChoiceQuestion({
  question,
  value,
  onChange,
  onBlur,
  fromProfile,
  error,
}: QuestionProps<SelectQuestionData>) {
  const intl = useIntl();
  // A limit at or above the number of options limits nothing, so it isn't shown.
  const hasChoiceLimit = question.maxChoices < question.options.length;
  return (
    <CheckboxGroup
      label={question.question}
      options={question.options}
      value={Array.isArray(value) ? value : []}
      // No picks is no answer, so an optional question is left out of the answers.
      onValueChange={(choices) => onChange(choices.length > 0 ? choices : undefined)}
      maxChecked={hasChoiceLimit ? question.maxChoices : undefined}
      hint={
        hasChoiceLimit && (
          <FormattedMessage id="question.maxChoices" values={{ maxChoices: question.maxChoices }} />
        )
      }
      required={question.required}
      requiredLabel={intl.formatMessage({ id: 'question.required' })}
      annotation={fromProfile && <FromProfileTag />}
      error={error}
      onBlur={onBlur}
    />
  );
}
