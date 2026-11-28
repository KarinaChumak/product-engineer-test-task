import type { FileAnswer } from '@/shared/questionnaire';

/** Reads a picked file into the answer the payload carries: its type, its content as base64 and its name. */
export function readFileAnswer(file: File): Promise<FileAnswer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      // A data URL is `data:<type>;base64,<content>`; base64 has no comma, so the content is all after the first.
      const dataUrl = reader.result as string;
      resolve({
        content_type: file.type,
        data: dataUrl.slice(dataUrl.indexOf(',') + 1),
        file_name: file.name,
      });
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error(`Could not read ${file.name}`)));
    reader.readAsDataURL(file);
  });
}
