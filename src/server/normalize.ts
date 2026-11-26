import { prefillFor, type Profile } from '@/server/prefill';
import type {
  ClientQuestion,
  JobQuestionnaire,
  JobSummary,
  Language,
  SelectOption,
} from '@/shared/questionnaire';

// Parses a recruiter's config once, into a `Job` that keeps everything the server needs: the repaired
// questions, their screening rules and their profile fields. The candidate's questionnaire, and later the
// answer checks and screening, are all read from that `Job`, so they agree on every repair. Screening rules
// (`must_be_*`) live beside each client question, never inside it, so they can't leave the server.
// A skeleton: Phase 2 adds the remaining types and the full set of repairs.

export type Warn = (message: string) => void;

/**
 * A rule that rejects a candidate by their answer. `must_be_true` arrives with boolean questions in
 * Phase 2; until then it's ignored like any rule on a type it isn't allowed on.
 */
export interface ScreeningRule {
  type: 'must_be_at_least' | 'must_be_below';
  threshold: number;
}

/** A question as the server knows it. `client` is what the candidate sees, and nothing else is sent. */
export interface JobQuestion {
  client: ClientQuestion;
  /** The profile field to prefill the answer from. */
  profileField?: string;
  rules: ScreeningRule[];
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

/** The question's screening rules. A rule on a type it isn't allowed on, or without a number, is ignored with a warning. */
function parseRules(raw: Raw, question: ClientQuestion, warn: Warn): ScreeningRule[] {
  const rules: ScreeningRule[] = [];
  for (const type of ['must_be_at_least', 'must_be_below'] as const) {
    const threshold = raw[type];
    if (threshold === undefined) continue;
    if (question.type !== 'numeric') {
      warn(`Ignored ${type} on "${question.id}": it only applies to numeric questions`);
    } else if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
      warn(`Ignored ${type} on "${question.id}": its threshold ${JSON.stringify(threshold)} is not a number`);
    } else {
      rules.push({ type, threshold });
    }
  }
  if (raw.must_be_true !== undefined) {
    warn(`Ignored must_be_true on "${question.id}": it only applies to boolean questions`);
  }
  return rules;
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
      return [{ client, rules: parseRules(question, client, warn), ...(profileField && { profileField }) }];
    }),
  };
}

/**
 * The questionnaire the candidate sees: the job without its screening rules. With a `profile`, each
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
