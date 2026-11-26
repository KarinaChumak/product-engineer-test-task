import { prefillFor, type Profile } from '@/server/prefill';
import type {
  ClientQuestion,
  JobQuestionnaire,
  JobSummary,
  Language,
  SelectOption,
} from '@/shared/questionnaire';

// Parses a recruiter's config once, into a `Job` that keeps what the server needs beside each repaired
// question: today its profile field. The candidate's questionnaire is read from that `Job`, and so will
// T-04's answer checks and screening, so they agree on every repair. Server-only data lives beside each
// client question, never inside it, so it can't leave the server.
// A skeleton: Phase 2 adds the remaining types and the full set of repairs.

export type Warn = (message: string) => void;

/** A question as the server knows it. `client` is what the candidate sees, and nothing else is sent. */
export interface JobQuestion {
  client: ClientQuestion;
  /** The profile field to prefill the answer from. */
  profileField?: string;
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

const isRecord = (value: unknown): value is Raw =>
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
    default:
      warn(`Dropped question "${id}": type ${JSON.stringify(raw.type)} is not supported`);
      return undefined;
  }
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

  return {
    id: asString(raw.id) ?? '',
    title: asString(raw.title) ?? '',
    company: asString(raw.company) ?? '',
    ...(language && { language }),
    questions: questions.flatMap((question) => {
      if (!isRecord(question)) return [];
      const client = normalizeQuestion(question, warn);
      if (!client) return [];
      const profileField = asString(question.profile_field);
      return [{ client, ...(profileField && { profileField }) }];
    }),
  };
}

/**
 * The questionnaire the candidate sees: only each question's `client` part. With a `profile`, each
 * question with a profile field gets its `prefill` from it.
 */
export function toJobQuestionnaire(job: Job, profile: Profile = {}): JobQuestionnaire {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    ...(job.language && { language: job.language }),
    questions: job.questions.map(({ client, profileField }) => {
      const prefill = profileField === undefined ? undefined : prefillFor(client, profileField, profile);
      return prefill === undefined ? client : { ...client, prefill };
    }),
  };
}
