import type { MessageKey } from '@/app/messages/en';

export const de: Record<MessageKey, string> = {
  'job.loading': 'Job wird geladen…',
  'job.notFound.title': 'Job nicht gefunden',
  'job.notFound.body':
    'Diesen Job gibt es nicht oder er ist nicht mehr offen. Prüfe den Link, dem du gefolgt bist.',
  'job.error.title': 'Wir konnten diesen Job nicht laden',
  'job.error.body': 'Etwas ist schiefgelaufen. Lade die Seite neu, um es noch einmal zu versuchen.',
};
