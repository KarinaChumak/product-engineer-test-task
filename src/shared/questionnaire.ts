// Types shared by the server and the client. These describe a job's questionnaire as the candidate
// sees it: no screening rule or threshold ever appears in them.

export type Language = 'de' | 'en';

export interface SelectOption {
  label: string;
  value: string;
}

interface QuestionBase {
  id: string;
  question: string;
  required: boolean;
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

/** The questions a job asks, with the job's title, company and language to show them in. */
export interface JobQuestionnaire {
  id: string;
  title: string;
  company: string;
  language: Language;
  questions: ClientQuestion[];
}
