import {
  allowedFileTypes,
  isAllowedFileType,
  maxFileBytes,
  type AnswerError,
} from '@/shared/prequalification';
import type { FileAnswer } from '@/shared/questionnaire';

/** The picker's `accept`: every allowed extension and content type, so it offers only those files. */
export const acceptedFileTypes = Object.entries(allowedFileTypes)
  .flatMap(([contentType, extensions]) => [...extensions, contentType])
  .join(',');

/**
 * The file's content type. Some systems give none for a `.docx`, so a file without one takes the type its
 * extension stands for among the allowed ones, or stays without one.
 */
export function getFileContentType(file: File): string {
  if (file.type !== '') return file.type;
  const name = file.name.toLowerCase();
  const match = Object.entries(allowedFileTypes).find(([, extensions]) =>
    extensions.some((extension) => name.endsWith(extension)),
  );
  return match?.[0] ?? '';
}

/**
 * What's wrong with a picked file by its type and size, checked before it is read, or undefined when it is
 * allowed. The server checks the same again on the answer.
 */
export function findPickedFileError(file: File): AnswerError | undefined {
  if (!isAllowedFileType(getFileContentType(file))) return 'file_type_not_allowed';
  return file.size > maxFileBytes ? 'file_too_large' : undefined;
}

/** Reads a picked file into the answer the payload carries: its type, its content as base64 and its name. */
export function readFileAnswer(file: File): Promise<FileAnswer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      // A data URL is `data:<type>;base64,<content>`; base64 has no comma, so the content is all after the first.
      const dataUrl = reader.result as string;
      resolve({
        content_type: getFileContentType(file),
        data: dataUrl.slice(dataUrl.indexOf(',') + 1),
        file_name: file.name,
      });
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error(`Could not read ${file.name}`)));
    reader.readAsDataURL(file);
  });
}
