import { readFile } from 'node:fs/promises';
import { findAnswerError, isEmptyAnswer } from '@/shared/answerValidation';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// Takes a question's answer from the candidate's profile, through its `profile_field`.
// A profile value that the question can't accept is left out.

// The shape the README gives `profile.json`. The file is read without checking it, so `prefillFor`
// only keeps a value that passes `findAnswerError`, which refuses one of the wrong type. A lookup only
// guards against a shape that would throw: `languages` that isn't a list.
export interface Profile {
  /** The candidate's id, which their prequalification answers are stored under. */
  id?: string;
  notice_period?: string;
  salary_expectation?: { amount?: number };
  location?: { city?: string };
  languages?: { language?: string; level?: string }[];
  years_of_experience?: number;
}

export async function profileFromFile(path: string): Promise<Profile> {
  return JSON.parse(await readFile(path, 'utf8')) as Profile;
}

/** The level of the profile's `languages` entry for `language`. */
function languageLevel(profile: Profile, language: string): string | undefined {
  if (!Array.isArray(profile.languages)) return undefined;
  return profile.languages.find((entry) => entry?.language === language)?.level;
}

/** Each `profile_field` the README lists, and where it lives in `profile.json`. */
const profileValueByField = {
  notice_period: (profile) => profile.notice_period,
  salary_expectation: (profile) => profile.salary_expectation?.amount,
  city: (profile) => profile.location?.city,
  german_level: (profile) => languageLevel(profile, 'de'),
  english_level: (profile) => languageLevel(profile, 'en'),
  years_of_experience: (profile) => profile.years_of_experience,
} satisfies Record<string, (profile: Profile) => AnswerValue | undefined>;

export type ProfileField = keyof typeof profileValueByField;

export const isProfileField = (field: unknown): field is ProfileField =>
  typeof field === 'string' && Object.hasOwn(profileValueByField, field);

/** The profile's answer, when the question would accept it if the candidate sent it themselves. */
export function prefillFor(
  question: ClientQuestion,
  field: ProfileField,
  profile: Profile,
): AnswerValue | undefined {
  const value = profileValueByField[field](profile);
  if (value === undefined || isEmptyAnswer(value)) return undefined;
  return findAnswerError(question, value) === undefined ? value : undefined;
}
