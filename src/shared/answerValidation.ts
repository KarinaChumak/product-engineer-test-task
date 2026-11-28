import {
  maxTextAnswerLength,
  type AnswerError,
  type PrequalificationRequest,
} from '@/shared/prequalification';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// Checks a candidate's answers against the questions they saw. The server runs it before storing
// anything and the client before sending, so both refuse the same answers with the same codes. It only
// checks the input and knows no rule about which answers the employer wants, so it is safe to ship.

/** Whether a sent value says nothing: blank text or no choices. It counts as no answer. */
export const isEmptyAnswer = (value: AnswerValue): boolean =>
  (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);

/**
 * The answer sent for a question, or undefined when there's none or it's empty. Only the request's own keys
 * count, so a question id such as `toString` isn't answered by the prototype.
 */
export function getSentAnswer(request: PrequalificationRequest, questionId: string): AnswerValue | undefined {
  const value = Object.hasOwn(request.answers, questionId) ? request.answers[questionId] : undefined;
  return value === undefined || isEmptyAnswer(value) ? undefined : value;
}

/** What's wrong with a non-empty answer to the question, or undefined when the question accepts it. */
export function findAnswerError(question: ClientQuestion, value: AnswerValue): AnswerError | undefined {
  switch (question.type) {
    case 'select': {
      const isOption = (choice: string) => question.options.some((option) => option.value === choice);
      if (question.maxChoices === 1) {
        if (typeof value !== 'string') return 'wrong_type';
        return isOption(value) ? undefined : 'not_an_option';
      }
      if (!Array.isArray(value)) return 'wrong_type';
      if (!value.every(isOption)) return 'not_an_option';
      if (new Set(value).size !== value.length) return 'repeated_choice';
      return value.length > question.maxChoices ? 'too_many_choices' : undefined;
    }
    case 'numeric':
      if (typeof value !== 'number') return 'wrong_type';
      if (!Number.isInteger(value)) return 'not_an_integer';
      return value < question.min || value > question.max ? 'out_of_range' : undefined;
    case 'text':
      if (typeof value !== 'string') return 'wrong_type';
      // Counted in characters as the candidate sees them, so an emoji is one, not two UTF-16 units.
      return [...value].length > maxTextAnswerLength ? 'too_long' : undefined;
    case 'boolean':
      return typeof value === 'boolean' ? undefined : 'wrong_type';
    case 'date':
      if (typeof value !== 'string') return 'wrong_type';
      if (!isCalendarDate(value)) return 'not_a_date';
      // Both are `YYYY-MM-DD`, so comparing them as text compares the dates.
      if (question.min !== undefined && value < question.min) return 'out_of_range';
      return question.max !== undefined && value > question.max ? 'out_of_range' : undefined;
  }
}

/** Whether the text is a `YYYY-MM-DD` date that exists in the calendar, so `2026-02-30` isn't one. */
export function isCalendarDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // An impossible day rolls over into the next month, so only a real date comes back unchanged.
  // setUTCFullYear, unlike Date.UTC, keeps years 0 to 99 as they are rather than moving them to the 1900s.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * The refused answers by question id, empty when every answer is valid. A required question without an
 * answer, or with an empty one, is `required`. Answers to questions not in the list are ignored, as the
 * payload leaves them out.
 */
export function findInvalidAnswers(
  questions: ClientQuestion[],
  request: PrequalificationRequest,
): Record<string, AnswerError> {
  const errors: Record<string, AnswerError> = {};
  for (const question of questions) {
    const value = getSentAnswer(request, question.id);
    const error =
      value === undefined ? (question.required ? 'required' : undefined) : findAnswerError(question, value);
    if (error) errors[question.id] = error;
  }
  return errors;
}
