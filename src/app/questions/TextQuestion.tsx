import { AnswerErrorMessage } from '@/app/questions/AnswerErrorMessage';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { TextField } from '@/components/TextField';
import type { TextQuestion as TextQuestionData } from '@/shared/questionnaire';

export function TextQuestion({
  question,
  value,
  onChange,
  fromProfile,
  error,
}: QuestionProps<TextQuestionData>) {
  return (
    <TextField
      label={question.question}
      value={typeof value === 'string' ? value : undefined}
      onValueChange={onChange}
      multiline={question.multiline}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={error && <AnswerErrorMessage question={question} error={error} />}
    />
  );
}
