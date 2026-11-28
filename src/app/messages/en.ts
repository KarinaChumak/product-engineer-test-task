export const en = {
  'job.loading': 'Loading the job…',
  'job.notFound.title': 'Job not found',
  'job.notFound.body': 'This job doesn’t exist or is no longer open. Check the link you followed.',
  'job.noQuestions': 'This job has no questions for you to answer.',
  'question.placeholder': 'Choose an option',
  'question.fromProfile': 'From your profile',
  'question.yes': 'Yes',
  'question.no': 'No',
  'question.maxChoices': 'Pick up to {maxChoices}',
  'question.required': 'required',
  'question.file.choose': 'Choose a file',
  'question.file.replace': 'Choose another file',
  'question.file.remove': 'Remove file',
  'job.error.title': 'We couldn’t load this job',
  'job.error.server': 'Our server ran into a problem. Please try again in a moment.',
  'job.error.network': 'We couldn’t reach the server. Check your internet connection.',
  'job.error.retry': 'Try again',
  'job.error.retrying': 'Trying again…',
  'prequalification.submit': 'Submit answers',
  'prequalification.error.server':
    'We couldn’t save your answers because our server ran into a problem. Your answers are still here, so please try again.',
  'prequalification.error.network':
    'We couldn’t reach the server. Check your internet connection and try again. Your answers are still here.',
  'prequalification.error.invalid':
    'Some of your answers can’t be accepted. Check them and try again. Your answers are still here.',
  'prequalification.passed.title': 'Your answers have been sent to {company}',
  'prequalification.passed.body':
    'Thanks for answering the questions for {title}. You fit what {company} is looking for, so they now have your answers and will get in touch.',
  'prequalification.notPassed.title': 'You don’t fit this job’s requirements',
  'prequalification.notPassed.body':
    'Thanks for answering the questions for {title} at {company}. Your answers don’t meet what the company asks for this job, so we won’t send them on.',
  'answerError.required': 'Answer this question to continue.',
  'answerError.wrong_type': 'This answer isn’t in a form we can take. Enter it again.',
  'answerError.not_an_option': 'Choose one of the options.',
  'answerError.repeated_choice': 'Choose each option only once.',
  'answerError.too_many_choices': 'Choose at most {maxChoices} options.',
  'answerError.not_an_integer': 'Enter a whole number, without decimals.',
  'answerError.out_of_range': 'Enter a number from {min} to {max}.',
  'answerError.too_long': 'Shorten your answer to {maxLength} characters or fewer.',
  'answerError.date_out_of_range':
    '{bounds, select, both {Pick a date from {min} to {max}.} min {Pick {min} or a later date.} other {Pick {max} or an earlier date.}}',
  'answerError.not_a_date': 'Enter a date that exists, or pick one from the calendar.',
  'answerError.file_type_not_allowed':
    'This type of file can’t be attached. Choose a PDF, DOCX, PNG or JPG file of up to {maxFileSize}.',
  'answerError.file_too_large':
    'This file is too big. Choose a PDF, DOCX, PNG or JPG file of up to {maxFileSize}.',
  'answerError.not_base64': 'This file couldn’t be read. Choose it again.',
  'answerError.missing_file_name': 'This file has no name. Rename it and choose it again.',
  'prequalification.completed.title': 'You’ve already answered the questions for this job',
  'prequalification.completed.body':
    'You answered the questions for {title} at {company}. Each job’s questions can be answered only once, so there’s nothing more to do here.',
  'jobSwitcher.nav': 'Jobs',
  'jobSwitcher.label': 'Switch job',
  'jobSwitcher.placeholder': 'Choose a job',
};

export type MessageKey = keyof typeof en;
