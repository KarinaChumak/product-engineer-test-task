import { prefillFor, type Profile } from '@/server/prefill';
import type { ClientQuestion, JobQuestionnaire, Language, SelectOption } from '@/shared/questionnaire';

// Turns a recruiter's config into the candidate's questionnaire, field by field, so screening rules (`must_be_*`)
// never leave the server. A skeleton: Phase 2 adds the remaining types and the full set of repairs.

export type Warn = (message: string) => void;

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

/**
 * Turns a job config into the questionnaire the candidate sees. With a `profile`, each question
 * with a `profile_field` gets its `prefill` from it.
 */
export function toJobQuestionnaire(raw: unknown, warn: Warn, profile: Profile = {}): JobQuestionnaire {
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
      const normalized = normalizeQuestion(question, warn);
      if (!normalized) return [];
      const field = asString(question.profile_field);
      const prefill = field === undefined ? undefined : prefillFor(normalized, field, profile);
      return [prefill === undefined ? normalized : { ...normalized, prefill }];
    }),
  };
}
