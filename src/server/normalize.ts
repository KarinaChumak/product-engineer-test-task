import { isProfileField, prefillFor, type Profile, type ProfileField } from '@/server/prefill';
import { isCalendarDate } from '@/shared/answerValidation';
import type {
  ClientQuestion,
  JobQuestionnaire,
  JobSummary,
  Language,
  SelectOption,
} from '@/shared/questionnaire';

// Parses a recruiter's config once, into a `Job` that keeps what the server needs beside each repaired
// question: its profile field and screening rules. The candidate's questionnaire, and the check and the
// screening of their prequalification answers, are all read from that `Job`, so they agree on every
// repair. Server-only data lives beside each client question, never inside it, so it can't leave the server.
// Every repair is logged through `warn`, so the logs tell the recruiter what was wrong with the config.

export type Warn = (message: string) => void;

/** The screening rules on a question, each only on a type it's allowed on. */
export interface ScreeningRules {
  /** Numeric: passes when the answer is at least this. */
  mustBeAtLeast?: number;
  /** Numeric: passes when the answer is below this (strict). */
  mustBeBelow?: number;
  /** Boolean: passes only when the answer is `true`. */
  mustBeTrue?: true;
}

/** A question as the server knows it. `client` is what the candidate sees, and nothing else is sent. */
export interface JobQuestion {
  client: ClientQuestion;
  /** The profile field to prefill the answer from. */
  profileField?: ProfileField;
  rules: ScreeningRules;
}

/** A job config after its repairs. Server-only: send `toJobQuestionnaire(job)` instead. */
export interface Job {
  id: string;
  title: string;
  company: string;
  language?: Language;
  questions: JobQuestion[];
}

type Raw = Record<string, unknown>;

export const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const asInteger = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) ? value : undefined;

/** The whole number at `raw[key]`, or undefined when it's absent, with a warning when it's something else. */
function parseIntegerSetting(raw: Raw, key: string, id: string, warn: Warn): number | undefined {
  const value = raw[key];
  if (value === undefined) return undefined;
  const integer = asInteger(value);
  if (integer === undefined)
    warn(`Ignored ${key} on "${id}": ${JSON.stringify(value)} is not a whole number`);
  return integer;
}

function normalizeOptions(raw: unknown): SelectOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((option) => {
    if (!isRecord(option)) return [];
    const label = asString(option.label);
    const value = asString(option.value);
    return label !== undefined && value !== undefined ? [{ label, value }] : [];
  });
}

/**
 * A date question's `min` and `max` as plain `YYYY-MM-DD` dates, `"today"` resolved to `today`. A bound
 * that is neither is dropped with a warning. When `min` is after `max` both are dropped, with one warning,
 * since which one is wrong can't be told.
 */
function parseDateBounds(raw: Raw, id: string, today: string, warn: Warn): { min?: string; max?: string } {
  const bounds: { min?: string; max?: string } = {};
  for (const key of ['min', 'max'] as const) {
    if (!(key in raw)) continue;
    const bound = raw[key];
    if (bound === 'today') bounds[key] = today;
    else if (typeof bound === 'string' && isCalendarDate(bound)) bounds[key] = bound;
    else warn(`Ignored ${key} on "${id}": ${JSON.stringify(bound)} is not a YYYY-MM-DD date or "today"`);
  }
  if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
    warn(`Ignored min and max on "${id}": min ${bounds.min} is after max ${bounds.max}`);
    return {};
  }
  return bounds;
}

/** The longest question text shown, in characters (code points, so an emoji is never split). */
export const maxQuestionLength = 255;

/** The question text, cut to `maxQuestionLength` characters with "…" as the last, so the cut shows. */
function cutQuestionText(question: string, id: string, warn: Warn): string {
  const characters = [...question];
  if (characters.length <= maxQuestionLength) return question;
  warn(`Cut the question text of "${id}" to ${maxQuestionLength} characters, from ${characters.length}`);
  return `${characters.slice(0, maxQuestionLength - 1).join('')}…`;
}

/**
 * How many options a select question allows: its `max_choices`, 1 when it has none, at least 1 and at
 * most the option count, with a warning for each repair.
 */
function parseMaxChoices(raw: Raw, id: string, optionCount: number, warn: Warn): number {
  const maxChoices = parseIntegerSetting(raw, 'max_choices', id, warn) ?? 1;
  if (maxChoices < 1) {
    warn(`Set max_choices on "${id}" to 1: ${maxChoices} allows no choice`);
    return 1;
  }
  if (maxChoices > optionCount) {
    warn(`Capped max_choices on "${id}" at ${optionCount}, its number of options, from ${maxChoices}`);
    return optionCount;
  }
  return maxChoices;
}

const defaultNumericRange = { min: 0, max: 100_000_000 };

/**
 * A numeric question's `min` and `max`, each defaulting to `defaultNumericRange`. When `min` is above
 * `max` both fall back to the default, with one warning, since which one is wrong can't be told.
 */
function parseNumericRange(raw: Raw, id: string, warn: Warn): { min: number; max: number } {
  const min = parseIntegerSetting(raw, 'min', id, warn) ?? defaultNumericRange.min;
  const max = parseIntegerSetting(raw, 'max', id, warn) ?? defaultNumericRange.max;
  if (min <= max) return { min, max };
  warn(`Ignored min and max on "${id}": min ${min} is above max ${max}`);
  return defaultNumericRange;
}

function normalizeQuestion(raw: Raw, today: string, warn: Warn): ClientQuestion | undefined {
  const id = asString(raw.id);
  const question = asString(raw.question);
  if (!id || !question) {
    warn(`Dropped a question without an id or question text`);
    return undefined;
  }
  // The text is cut in `parseJob`, once the question is kept, so a dropped one logs no cut.
  const base = { id, question, required: raw.required === true };

  switch (raw.type) {
    case 'select': {
      const options = normalizeOptions(raw.options);
      if (options.length === 0) {
        warn(`Dropped question "${id}": a select question needs at least one option`);
        return undefined;
      }
      return { ...base, type: 'select', options, maxChoices: parseMaxChoices(raw, id, options.length, warn) };
    }
    case 'numeric':
      return { ...base, type: 'numeric', ...parseNumericRange(raw, id, warn) };
    case 'text':
      return { ...base, type: 'text', multiline: raw.multiline === true };
    case 'boolean':
      return { ...base, type: 'boolean' };
    case 'date':
      return { ...base, type: 'date', ...parseDateBounds(raw, id, today, warn) };
    case 'file':
      return { ...base, type: 'file' };
    default:
      warn(`Dropped question "${id}": type ${JSON.stringify(raw.type)} is not supported`);
      return undefined;
  }
}

const numericRules = { must_be_at_least: 'mustBeAtLeast', must_be_below: 'mustBeBelow' } as const;

/** The question's screening rules. A rule on a type it isn't allowed on, or without a number, is ignored. */
function parseRules(raw: Raw, client: ClientQuestion, warn: Warn): ScreeningRules {
  const rules: ScreeningRules = {};
  for (const [key, name] of Object.entries(numericRules)) {
    if (!(key in raw)) continue;
    const threshold = raw[key];
    if (client.type !== 'numeric')
      warn(`Ignored ${key} on "${client.id}": it only applies to numeric questions`);
    else if (typeof threshold !== 'number' || !Number.isFinite(threshold))
      warn(`Ignored ${key} on "${client.id}": it isn't a number`);
    else rules[name] = threshold;
  }
  if ('must_be_true' in raw) {
    if (client.type !== 'boolean')
      warn(`Ignored must_be_true on "${client.id}": it only applies to boolean questions`);
    else if (raw.must_be_true !== true) warn(`Ignored must_be_true on "${client.id}": it isn't true`);
    else rules.mustBeTrue = true;
  }
  return rules;
}

function toLanguage(value: unknown, warn: Warn): Language | undefined {
  if (value === 'de' || value === 'en') return value;
  if (value !== undefined)
    warn(`Ignored language ${JSON.stringify(value)}: only "de" and "en" are supported`);
  return undefined;
}

/** The job's entry in the list of jobs, or undefined for a config without a string `id` (it can't be opened). */
export function toJobSummary(raw: unknown): JobSummary | undefined {
  if (!isRecord(raw)) return undefined;
  const id = asString(raw.id);
  if (!id) return undefined;
  return { id, title: asString(raw.title) || id, company: asString(raw.company) ?? '' };
}

/**
 * Parses a job config and repairs it, warning about each repair. `today` is the server's current date as
 * `YYYY-MM-DD`, which a date question's `"today"` becomes. Throws when the config isn't an object.
 */
export function parseJob(raw: unknown, today: string, warn: Warn): Job {
  if (!isRecord(raw)) throw new Error('Job config is not an object');
  const language = toLanguage(raw.language, warn);
  const questions = Array.isArray(raw.questions) ? raw.questions : [];
  const seenIds = new Set<string>();

  return {
    id: asString(raw.id) ?? '',
    title: asString(raw.title) ?? '',
    company: asString(raw.company) ?? '',
    ...(language && { language }),
    questions: questions.flatMap((question) => {
      if (!isRecord(question)) return [];
      const normalized = normalizeQuestion(question, today, warn);
      if (!normalized) return [];
      // The README: on duplicate ids only the first question counts. A dropped question doesn't claim its id.
      if (seenIds.has(normalized.id)) {
        warn(`Dropped a second question "${normalized.id}": only the first question with an id counts`);
        return [];
      }
      seenIds.add(normalized.id);
      const client = { ...normalized, question: cutQuestionText(normalized.question, normalized.id, warn) };
      const profileField = parseProfileField(question, client, warn);
      return [{ client, ...(profileField && { profileField }), rules: parseRules(question, client, warn) }];
    }),
  };
}

/** The question's `profile_field`, when it's one the README lists. Any other is dropped with a warning. */
function parseProfileField(raw: Raw, client: ClientQuestion, warn: Warn): ProfileField | undefined {
  if (raw.profile_field === undefined || isProfileField(raw.profile_field)) return raw.profile_field;
  warn(
    `Ignored profile_field ${JSON.stringify(raw.profile_field)} on "${client.id}": it's not a known profile field`,
  );
  return undefined;
}

/**
 * The questionnaire the candidate sees: only each question's `client` part. With a `profile`, each
 * question with a profile field gets its `prefill` from it.
 */
export function toJobQuestionnaire(job: Job, profile: Profile = {}, isCompleted = false): JobQuestionnaire {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    ...(job.language && { language: job.language }),
    isCompleted,
    questions: job.questions.map(({ client, profileField }) => {
      const prefill = profileField === undefined ? undefined : prefillFor(client, profileField, profile);
      return prefill === undefined ? client : { ...client, prefill };
    }),
  };
}
