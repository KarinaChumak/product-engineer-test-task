import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import { AnswerErrorMessage } from '@/app/questions/AnswerErrorMessage';
import { formatFileSize } from '@/app/questions/formatFileSize';
import { acceptedFileTypes, findPickedFileError, readFileAnswer } from '@/app/questions/readFileAnswer';
import type { QuestionProps } from '@/app/questions/types';
import { FileField } from '@/components/FileField';
import type { AnswerError } from '@/shared/prequalification';
import type { FileQuestion as FileQuestionData } from '@/shared/questionnaire';

/** Shows the file the candidate picks, and answers with it once it is read. */
export function FileQuestion({
  question,
  onChange,
  fromProfile,
  error,
  onBlur,
}: QuestionProps<FileQuestionData>) {
  const intl = useIntl();
  const [pickedFile, setPickedFile] = useState<File>();
  // Why the last picked file was refused. Shown as soon as it's picked, without waiting for the candidate to leave the field.
  const [pickError, setPickError] = useState<AnswerError>();
  // The file picked last, so a slow read of an earlier one, or of one since removed, doesn't answer.
  const latestPickRef = useRef<File>(undefined);

  async function answerWithFile(file: File) {
    const refusal = findPickedFileError(file);
    if (refusal) {
      // Refused before it's read, and an earlier file goes too, so the field never shows a file beside an error about another.
      removeFile();
      setPickError(refusal);
      return;
    }
    setPickError(undefined);
    latestPickRef.current = file;
    setPickedFile(file);
    // Until the new file is read there is no answer, so a submit meanwhile never sends an earlier file.
    onChange(undefined);
    try {
      const answer = await readFileAnswer(file);
      if (latestPickRef.current === file) onChange(answer);
    } catch {
      // The browser couldn't read it (the file was moved or deleted since), so the field goes back to empty
      // and says why.
      if (latestPickRef.current !== file) return;
      removeFile();
      setPickError('not_base64');
    }
  }

  function removeFile() {
    latestPickRef.current = undefined;
    setPickedFile(undefined);
    onChange(undefined);
  }

  return (
    <FileField
      label={question.question}
      chooseLabel={intl.formatMessage({ id: 'question.file.choose' })}
      replaceLabel={intl.formatMessage({ id: 'question.file.replace' })}
      fileName={pickedFile?.name}
      fileSizeLabel={pickedFile && formatFileSize(intl, pickedFile.size)}
      onFilePick={(file) => void answerWithFile(file)}
      accept={acceptedFileTypes}
      removeLabel={intl.formatMessage({ id: 'question.file.remove' })}
      onFileRemove={removeFile}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={pickError ? <AnswerErrorMessage question={question} error={pickError} /> : error}
      onBlur={onBlur}
    />
  );
}
