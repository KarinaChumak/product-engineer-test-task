import { useState } from 'react';
import { useIntl, type IntlShape } from 'react-intl';
import { FromProfileTag } from '@/app/questions/FromProfileTag';
import type { QuestionProps } from '@/app/questions/types';
import { FileField } from '@/components/FileField';
import type { FileQuestion as FileQuestionData } from '@/shared/questionnaire';

const kilobytesPerMegabyte = 1000;
const bytesPerKilobyte = 1000;
const bytesPerMegabyte = bytesPerKilobyte * kilobytesPerMegabyte;

function formatFileSize(intl: IntlShape, bytes: number) {
  // Compared after rounding to one decimal, so 999,999 bytes is "1 MB", not "1,000 kB".
  const roundedKilobytes = Math.round((bytes / bytesPerKilobyte) * 10) / 10;
  const [value, unit] =
    bytes >= bytesPerMegabyte || roundedKilobytes >= kilobytesPerMegabyte
      ? [bytes / bytesPerMegabyte, 'megabyte']
      : bytes >= bytesPerKilobyte
        ? [bytes / bytesPerKilobyte, 'kilobyte']
        : [bytes, 'byte'];
  return intl.formatNumber(value, { style: 'unit', unit, maximumFractionDigits: 1 });
}

/**
 * Shows the file the candidate picks. It doesn't set the answer yet: reading the file into one is a later
 * ticket's work.
 */
export function FileQuestion({ question, fromProfile, error, onBlur }: QuestionProps<FileQuestionData>) {
  const intl = useIntl();
  const [pickedFile, setPickedFile] = useState<File>();

  return (
    <FileField
      label={question.question}
      chooseLabel={intl.formatMessage({ id: 'question.file.choose' })}
      replaceLabel={intl.formatMessage({ id: 'question.file.replace' })}
      fileName={pickedFile?.name}
      fileSizeLabel={pickedFile && formatFileSize(intl, pickedFile.size)}
      onFilePick={setPickedFile}
      required={question.required}
      annotation={fromProfile && <FromProfileTag />}
      error={error}
      onBlur={onBlur}
    />
  );
}
