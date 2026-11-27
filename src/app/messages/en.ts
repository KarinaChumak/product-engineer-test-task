export const en = {
  'job.loading': 'Loading the job…',
  'job.notFound.title': 'Job not found',
  'job.notFound.body': 'This job doesn’t exist or is no longer open. Check the link you followed.',
  'job.noQuestions': 'This job has no questions for you to answer.',
  'question.placeholder': 'Choose an option',
  'question.fromProfile': 'From your profile',
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
  'jobSwitcher.nav': 'Jobs',
  'jobSwitcher.label': 'Switch job',
  'jobSwitcher.placeholder': 'Choose a job',
};

export type MessageKey = keyof typeof en;
