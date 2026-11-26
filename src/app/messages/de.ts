import type { MessageKey } from '@/app/messages/en';

export const de: Record<MessageKey, string> = {
  'job.loading': 'Job wird geladen…',
  'job.notFound.title': 'Job nicht gefunden',
  'job.notFound.body':
    'Diesen Job gibt es nicht oder er ist nicht mehr offen. Prüfe den Link, dem du gefolgt bist.',
  'job.noQuestions': 'Für diesen Job musst du keine Fragen beantworten.',
  'question.placeholder': 'Option auswählen',
  'question.fromProfile': 'Aus deinem Profil',
  'job.error.title': 'Wir konnten diesen Job nicht laden',
  'job.error.server': 'Auf unserem Server ist ein Fehler aufgetreten. Versuche es gleich noch einmal.',
  'job.error.network': 'Wir konnten den Server nicht erreichen. Prüfe deine Internetverbindung.',
  'job.error.retry': 'Erneut versuchen',
};
