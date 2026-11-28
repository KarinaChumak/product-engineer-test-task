import { useState } from 'react';
import { findInvalidAnswers } from '@/shared/answerValidation';
import type { AnswerError } from '@/shared/prequalification';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

/**
 * The answers to a questionnaire's questions and the errors to show on them, following "T-07: Form state
 * stays in React, with no form library". A question shows its error once the candidate has left it, or once
 * its step's Next or the submit has checked it.
 */
export function useQuestionnaireAnswers(questions: ClientQuestion[]) {
  // Only the answers the candidate changed; the rest fall back to the profile prefill. A cleared
  // answer stays in here as undefined, so it doesn't fall back.
  const [changed, setChanged] = useState<Record<string, AnswerValue | undefined>>({});
  // The questions whose errors show: left at least once, or checked by Next or the submit.
  const [errorShownIds, setErrorShownIds] = useState<ReadonlySet<string>>(new Set());
  // The answers the server refused in its last 422. Changing an answer drops its error.
  const [serverErrors, setServerErrors] = useState<Partial<Record<string, AnswerError>>>({});

  const getAnswer = (question: ClientQuestion) =>
    Object.hasOwn(changed, question.id) ? changed[question.id] : question.prefill;
  const answers = Object.fromEntries(
    questions.flatMap((question) => {
      const value = getAnswer(question);
      return value === undefined ? [] : [[question.id, value]];
    }),
  );
  // The same check the server runs, on every render, so a shown error follows the answer as it changes.
  const invalidAnswers = findInvalidAnswers(questions, { answers });

  const showErrors = (ids: Iterable<string>) =>
    setErrorShownIds((shown) => {
      const next = new Set(shown);
      for (const id of ids) next.add(id);
      return next.size === shown.size ? shown : next;
    });

  return {
    answers,
    invalidAnswers,
    getAnswer,
    /** The error to show on this question now, if any. */
    getShownError: (question: ClientQuestion): AnswerError | undefined =>
      (errorShownIds.has(question.id) ? invalidAnswers[question.id] : undefined) ?? serverErrors[question.id],
    setAnswer: (question: ClientQuestion, value: AnswerValue | undefined) => {
      setChanged((answers) => ({ ...answers, [question.id]: value }));
      setServerErrors((errors) => (errors[question.id] ? { ...errors, [question.id]: undefined } : errors));
    },
    /** Shows these questions' errors from now on, as when the candidate leaves them. */
    showErrors,
    /** Replaces the server's refusals with these; `{}` clears them. */
    setServerErrors,
  };
}
