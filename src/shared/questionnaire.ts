// Types shared by the server and the client. These describe a job's questionnaire as the candidate
// sees it: no screening rule or threshold ever appears in them.

export type Language = 'de' | 'en';

/** A file the candidate attached, as the README's payload carries it. */
export interface FileAnswer {
  content_type: string;
  /** The file's content, base64-encoded. */
  data: string;
  file_name: string;
}

export type AnswerValue = string | number | boolean | string[] | FileAnswer;

export interface SelectOption {
  label: string;
  value: string;
}

interface QuestionBase {
  id: string;
  question: string;
  required: boolean;
  /** The answer taken from the candidate's profile, for them to confirm. */
  prefill?: AnswerValue;
}

export interface SelectQuestion extends QuestionBase {
  type: 'select';
  options: SelectOption[];
  maxChoices: number;
}

export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  min: number;
  max: number;
}

export interface TextQuestion extends QuestionBase {
  type: 'text';
  multiline: boolean;
}

/** A yes/no question, answered `true` or `false`. */
export interface BooleanQuestion extends QuestionBase {
  type: 'boolean';
}

/** A calendar date, answered as a `YYYY-MM-DD` string. */
export interface DateQuestion extends QuestionBase {
  type: 'date';
  /** The earliest date allowed, as `YYYY-MM-DD`. Inclusive. */
  min?: string;
  /** The latest date allowed, as `YYYY-MM-DD`. Inclusive. */
  max?: string;
}

/** A file upload, answered with a `FileAnswer`. */
export interface FileQuestion extends QuestionBase {
  type: 'file';
}

export type ClientQuestion =
  SelectQuestion | NumericQuestion | TextQuestion | BooleanQuestion | DateQuestion | FileQuestion;

export type QuestionType = ClientQuestion['type'];

/** A job in the list of open jobs: enough to tell it apart and open it, and nothing about its questions. */
export interface JobSummary {
  id: string;
  title: string;
  company: string;
}

/** The questions a job asks, with the job's title, company and language to show them in. */
export interface JobQuestionnaire {
  id: string;
  title: string;
  company: string;
  /** Unset when the job has no supported language; the UI then uses the browser's. */
  language?: Language;
  /** The candidate has already submitted answers for this job, so they can't answer it again. */
  isCompleted: boolean;
  questions: ClientQuestion[];
}
