import { readFile } from 'node:fs/promises';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// Takes a question's answer from the candidate's profile, through its `profile_field`.
// A profile value that the question can't accept is left out.

export interface Profile {
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

function accepts(question: ClientQuestion, value: AnswerValue): boolean {
  switch (question.type) {
    case 'select':
      return typeof value === 'string' && question.options.some((option) => option.value === value);
    case 'numeric':
      return Number.isInteger(value) && Number(value) >= question.min && Number(value) <= question.max;
    default:
      return false;
  }
}

export function prefillFor(
  question: ClientQuestion,
  field: string,
  profile: Profile,
): AnswerValue | undefined {
  const value = profileValue(field, profile);
  return value !== undefined && accepts(question, value) ? value : undefined;
}
