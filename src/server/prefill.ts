import { readFile } from 'node:fs/promises';
import { findAnswerError, isEmptyAnswer } from '@/server/validation';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// Takes a question's answer from the candidate's profile, through its `profile_field`.
// A profile value that the question can't accept is left out.

export interface Profile {
  /** The candidate's id, which their prequalification answers are stored under. */
  id?: string;
  notice_period?: string;
  salary_expectation?: { amount?: number };
}

export async function profileFromFile(path: string): Promise<Profile> {
  return JSON.parse(await readFile(path, 'utf8')) as Profile;
}

function profileValue(field: string, profile: Profile): AnswerValue | undefined {
  switch (field) {
    case 'notice_period':
      return profile.notice_period;
    case 'salary_expectation':
      return profile.salary_expectation?.amount;
    default:
      return undefined;
  }
}

/** The profile's answer, when the question would accept it if the candidate sent it themselves. */
export function prefillFor(
  question: ClientQuestion,
  field: string,
  profile: Profile,
): AnswerValue | undefined {
  const value = profileValue(field, profile);
  if (value === undefined || isEmptyAnswer(value)) return undefined;
  return findAnswerError(question, value) === undefined ? value : undefined;
}
