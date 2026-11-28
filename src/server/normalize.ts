import { isProfileField, prefillFor, type Profile, type ProfileField } from '@/server/prefill';
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
// A skeleton: Phase 2 adds the remaining types and the full set of repairs.

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

function normalizeOptions(raw: unknown): SelectOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((option) => {
    if (!isRecord(option)) return [];
    const label = asString(option.label);
    const value = asString(option.value);
    return label !== undefined && value !== undefined ? [{ label, value }] : [];
  });
}

function normalizeQuestion(raw: Raw, warn: Warn): ClientQuestion | undefined {
  const id = asString(raw.id);
  const question = asString(raw.question);
  if (!id || !question) {
    warn(`Dropped a question without an id or question text`);
    return undefined;
  }
  const base = { id, question, required: raw.required === true };

  switch (raw.type) {
    case 'select':
      return {
        ...base,
        type: 'select',
        options: normalizeOptions(raw.options),
        maxChoices: asInteger(raw.max_choices) ?? 1,
      };
    case 'numeric':
      return {
        ...base,
        type: 'numeric',
        min: asInteger(raw.min) ?? 0,
        max: asInteger(raw.max) ?? 100_000_000,
      };
    case 'text':
      return { ...base, type: 'text', multiline: raw.multiline === true };
    case 'boolean':
      return { ...base, type: 'boolean' };
    case 'date':
      // Any date is taken until T-11b applies the range, so the candidate isn't refused a date the
      // recruiter would accept.
      if ('min' in raw || 'max' in raw)
        warn(`Ignored min and max on "${id}": a date question's range isn't applied yet`);
      return { ...base, type: 'date' };
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

/** Parses a job config and repairs it, warning about each repair. Throws when the config isn't an object. */
export function parseJob(raw: unknown, warn: Warn): Job {
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
      const client = normalizeQuestion(question, warn);
      if (!client) return [];
      // The README: on duplicate ids only the first question counts. A dropped question doesn't claim its id.
      if (seenIds.has(client.id)) {
        warn(`Dropped a second question "${client.id}": only the first question with an id counts`);
        return [];
      }
      seenIds.add(client.id);
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
