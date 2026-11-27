import type { Job } from '@/server/normalize';
import {
  maxTextAnswerLength,
  type AnswerError,
  type PrequalificationRequest,
} from '@/shared/prequalification';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// Checks a candidate's answers against the job's normalized questions, the same ones the candidate saw.
// It only checks the input: whether an answer passes screening is `screenAnswers`'s job, and a failed rule
// is never an invalid answer.

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
  }
}

/**
 * The refused answers by question id, empty when every answer is valid. A required question without an
 * answer, or with an empty one, is `required`. Answers to questions the job doesn't ask are ignored, as the
 * payload leaves them out.
 */
export function findInvalidAnswers(job: Job, request: PrequalificationRequest): Record<string, AnswerError> {
  const errors: Record<string, AnswerError> = {};
  for (const { client } of job.questions) {
    const value = getSentAnswer(request, client.id);
    const error =
      value === undefined ? (client.required ? 'required' : undefined) : findAnswerError(client, value);
    if (error) errors[client.id] = error;
  }
  return errors;
}
