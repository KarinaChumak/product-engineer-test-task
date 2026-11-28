import type { MessageKey } from '@/app/messages/en';

export const de: Record<MessageKey, string> = {
  'job.loading': 'Job wird geladen…',
  'job.notFound.title': 'Job nicht gefunden',
  'job.notFound.body':
    'Diesen Job gibt es nicht oder er ist nicht mehr offen. Prüfe den Link, dem du gefolgt bist.',
  'job.noQuestions': 'Für diesen Job musst du keine Fragen beantworten.',
  'question.placeholder': 'Option auswählen',
  'question.fromProfile': 'Aus deinem Profil',
  'question.yes': 'Ja',
  'question.no': 'Nein',
  'question.maxChoices': 'Wähle bis zu {maxChoices} aus',
  'question.required': 'Pflichtfeld',
  'question.file.choose': 'Datei auswählen',
  'question.file.replace': 'Andere Datei auswählen',
  'question.file.remove': 'Datei entfernen',
  'job.error.title': 'Wir konnten diesen Job nicht laden',
  'job.error.server': 'Auf unserem Server ist ein Fehler aufgetreten. Versuche es gleich noch einmal.',
  'job.error.network': 'Wir konnten den Server nicht erreichen. Prüfe deine Internetverbindung.',
  'job.error.retry': 'Erneut versuchen',
  'job.error.retrying': 'Wird erneut versucht…',
  'prequalification.submit': 'Antworten absenden',
  'prequalification.error.server':
    'Wir konnten deine Antworten nicht speichern, weil auf unserem Server ein Fehler aufgetreten ist. Deine Antworten sind noch da, versuche es also noch einmal.',
  'prequalification.error.network':
    'Wir konnten den Server nicht erreichen. Prüfe deine Internetverbindung und versuche es noch einmal. Deine Antworten sind noch da.',
  'prequalification.error.invalid':
    'Einige deiner Antworten können wir nicht annehmen. Prüfe sie und versuche es noch einmal. Deine Antworten sind noch da.',
  'prequalification.passed.title': 'Deine Antworten wurden an {company} gesendet',
  'prequalification.passed.body':
    'Danke, dass du die Fragen zu {title} beantwortet hast. Du passt zu dem, was {company} sucht, deshalb hat das Unternehmen jetzt deine Antworten und meldet sich bei dir.',
  'prequalification.notPassed.title': 'Du erfüllst die Anforderungen dieses Jobs nicht',
  'prequalification.notPassed.body':
    'Danke, dass du die Fragen zu {title} bei {company} beantwortet hast. Deine Antworten entsprechen nicht dem, was das Unternehmen für diesen Job verlangt, deshalb leiten wir sie nicht weiter.',
  'answerError.required': 'Beantworte diese Frage, um fortzufahren.',
  'answerError.wrong_type':
    'Diese Antwort hat ein Format, das wir nicht annehmen können. Gib sie noch einmal ein.',
  'answerError.not_an_option': 'Wähle eine der Optionen.',
  'answerError.repeated_choice': 'Wähle jede Option nur einmal.',
  'answerError.too_many_choices': 'Wähle höchstens {maxChoices} Optionen.',
  'answerError.not_an_integer': 'Gib eine ganze Zahl ohne Nachkommastellen ein.',
  'answerError.out_of_range': 'Gib eine Zahl von {min} bis {max} ein.',
  'answerError.too_long': 'Kürze deine Antwort auf höchstens {maxLength} Zeichen.',
  'answerError.date_out_of_range':
    '{bounds, select, both {Wähle ein Datum vom {min} bis zum {max}.} min {Wähle den {min} oder ein späteres Datum.} other {Wähle den {max} oder ein früheres Datum.}}',
  'answerError.not_a_date': 'Gib ein Datum ein, das es gibt, oder wähle eins im Kalender.',
  'answerError.file_type_not_allowed':
    'Diese Art von Datei können wir nicht annehmen. Wähle eine PDF-, DOCX-, PNG- oder JPG-Datei mit höchstens {maxFileSize}.',
  'answerError.file_too_large':
    'Diese Datei ist zu groß. Wähle eine PDF-, DOCX-, PNG- oder JPG-Datei mit höchstens {maxFileSize}.',
  'answerError.not_base64': 'Diese Datei konnten wir nicht lesen. Wähle sie noch einmal.',
  'answerError.missing_file_name': 'Diese Datei hat keinen Namen. Benenne sie um und wähle sie noch einmal.',
  'prequalification.completed.title': 'Du hast die Fragen zu diesem Job schon beantwortet',
  'prequalification.completed.body':
    'Du hast die Fragen zu {title} bei {company} schon beantwortet. Die Fragen eines Jobs kannst du nur einmal beantworten, hier gibt es also nichts mehr zu tun.',
  'jobSwitcher.nav': 'Jobs',
  'jobSwitcher.label': 'Job wechseln',
  'jobSwitcher.placeholder': 'Job auswählen',
};
