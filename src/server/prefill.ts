import { readFile } from 'node:fs/promises';
import { findAnswerError, isEmptyAnswer } from '@/shared/answerValidation';
import type { AnswerValue, ClientQuestion } from '@/shared/questionnaire';

// Takes a question's answer from the candidate's profile, through its `profile_field`.
// A profile value that the question can't accept is left out.

// The profile is read from a file without checking its shape, so every field may hold anything.
export interface Profile {
  /** The candidate's id, which their prequalification answers are stored under. */
  id?: string;
  notice_period?: string;
  salary_expectation?: { amount?: number };
  location?: { city?: string };
  languages?: { language?: string; level?: string }[];
  years_of_experience?: number;
}

/** The `profile_field` values the README lists. */
const profileFields = [
  'notice_period',
  'salary_expectation',
  'city',
  'german_level',
  'english_level',
  'years_of_experience',
] as const;

export type ProfileField = (typeof profileFields)[number];

export const isProfileField = (field: string): field is ProfileField =>
  (profileFields as readonly string[]).includes(field);

export async function profileFromFile(path: string): Promise<Profile> {
  return JSON.parse(await readFile(path, 'utf8')) as Profile;
}

/** The level of the profile's `languages` entry for `language`. */
function languageLevel(profile: Profile, language: string): string | undefined {
  if (!Array.isArray(profile.languages)) return undefined;
  return profile.languages.find((entry) => entry?.language === language)?.level;
}

/** Where the README says each profile field lives in `profile.json`. */
function profileValue(field: ProfileField, profile: Profile): AnswerValue | undefined {
  switch (field) {
    case 'notice_period':
      return profile.notice_period;
    case 'salary_expectation':
      return profile.salary_expectation?.amount;
    case 'city':
      return profile.location?.city;
    case 'german_level':
      return languageLevel(profile, 'de');
    case 'english_level':
      return languageLevel(profile, 'en');
    case 'years_of_experience':
      return profile.years_of_experience;
  }
}

/** The profile's answer, when the question would accept it if the candidate sent it themselves. */
export function prefillFor(
  question: ClientQuestion,
  field: ProfileField,
  profile: Profile,
): AnswerValue | undefined {
  const value = profileValue(field, profile);
  if (value === undefined || isEmptyAnswer(value)) return undefined;
  return findAnswerError(question, value) === undefined ? value : undefined;
}
