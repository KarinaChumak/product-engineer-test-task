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
  'job.error.retrying': 'Wird erneut versucht…',
  'application.submit': 'Bewerbung senden',
  'application.submitting': 'Wird gesendet…',
  'application.error.server':
    'Wir konnten deine Bewerbung nicht senden, weil auf unserem Server ein Fehler aufgetreten ist. Deine Antworten sind noch da, versuche es also noch einmal.',
  'application.error.network':
    'Wir konnten den Server nicht erreichen. Prüfe deine Internetverbindung und versuche es noch einmal. Deine Antworten sind noch da.',
  'application.sent.title': 'Bewerbung gesendet',
  'application.sent.body':
    'Danke für deine Bewerbung als {title} bei {company}. Das Unternehmen meldet sich bei dir.',
  'jobSwitcher.nav': 'Jobs',
  'jobSwitcher.label': 'Job wechseln',
  'jobSwitcher.placeholder': 'Job auswählen',
};
