// Types shared by the server and the client. These describe a job's questionnaire as the candidate
// sees it: no screening rule or threshold ever appears in them.

export type Language = 'de' | 'en';

export type AnswerValue = string | number | boolean | string[];

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

export type ClientQuestion = SelectQuestion | NumericQuestion | TextQuestion;

export type QuestionType = ClientQuestion['type'];

/** The questions a job asks, with the job's title, company and language to show them in. */
export interface JobQuestionnaire {
  id: string;
  title: string;
  company: string;
  language: Language;
  questions: ClientQuestion[];
}
