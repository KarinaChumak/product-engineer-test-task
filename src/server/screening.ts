import type { Job, ScreeningRules } from '@/server/normalize';
import type { AnswerValue } from '@/shared/questionnaire';

// Screens prequalification answers against the job's rules, which decides whether they go to the employer.
// Server-only: the candidate never learns the result.

/** The README contract's `screening`: `passed` is true when no rule failed. */
export interface Screening {
  passed: boolean;
  failed: string[];
}

/** Whether `answer` passes every rule on its question. A missing answer fails any rule. */
function passesRules(rules: ScreeningRules, answer: AnswerValue | undefined): boolean {
  const { mustBeAtLeast, mustBeBelow } = rules;
  if (mustBeAtLeast === undefined && mustBeBelow === undefined) return true;
  if (typeof answer !== 'number') return false;
  return (
    (mustBeAtLeast === undefined || answer >= mustBeAtLeast) &&
    (mustBeBelow === undefined || answer < mustBeBelow)
  );
}

/** Screens the answers by question id against the job's rules. */
export function screenAnswers(job: Job, answers: ReadonlyMap<string, AnswerValue>): Screening {
  const failed = job.questions
    .filter(({ client: question, rules }) => !passesRules(rules, answers.get(question.id)))
    .map(({ client: question }) => question.id);
  return { passed: failed.length === 0, failed };
}
