import { de } from '@/app/messages/de';
import { en, type MessageKey } from '@/app/messages/en';
import type { Language } from '@/shared/questionnaire';

export type { MessageKey };

export const messages: Record<Language, Record<MessageKey, string>> = { de, en };

/** The UI language before the job, and with it `job.language`, has loaded. */
export function getBrowserLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
}
