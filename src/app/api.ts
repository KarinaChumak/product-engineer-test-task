import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type {
  AnswerError,
  InvalidAnswersResponse,
  PrequalificationRequest,
  PrequalificationResult,
} from '@/shared/prequalification';
import type { JobQuestionnaire, JobSummary } from '@/shared/questionnaire';

/** The server answered 404: there's nothing to retry. */
export class NotFoundError extends Error {}

/** The server answered 422: some answers aren't valid, so sending them again won't help. */
export class InvalidAnswersError extends Error {
  constructor(
    message: string,
    /** Why each refused answer was refused, by question id. */
    readonly fields: Record<string, AnswerError>,
  ) {
    super(message);
  }
}

export async function fetchJobQuestionnaire(jobId: string, signal: AbortSignal): Promise<JobQuestionnaire> {
  const url = `/api/jobs/${encodeURIComponent(jobId)}/questionnaire`;
  const response = await fetch(url, { signal });
  if (response.status === 404) throw new NotFoundError(`GET ${url} returned 404`);
  if (!response.ok) throw new Error(`GET ${url} returned ${response.status}`);
  return (await response.json()) as JobQuestionnaire;
}

export async function fetchJobs(signal: AbortSignal): Promise<JobSummary[]> {
  const response = await fetch('/api/jobs', { signal });
  if (!response.ok) throw new Error(`GET /api/jobs returned ${response.status}`);
  return (await response.json()) as JobSummary[];
}

/** Sends the candidate's prequalification answers, and resolves with whether they passed. */
export async function submitPrequalification(
  jobId: string,
  request: PrequalificationRequest,
): Promise<PrequalificationResult> {
  const url = `/api/jobs/${encodeURIComponent(jobId)}/prequalification`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (response.status === 422) {
    const { fields } = (await response.json()) as InvalidAnswersResponse;
    throw new InvalidAnswersError(`POST ${url} returned 422`, fields);
  }
  if (!response.ok) throw new Error(`POST ${url} returned ${response.status}`);
  return (await response.json()) as PrequalificationResult;
}

export function createQueryClient() {
  const logFailedRequest = (error: Error) => console.warn('A request failed', error);
  return new QueryClient({
    queryCache: new QueryCache({ onError: logFailedRequest }),
    mutationCache: new MutationCache({ onError: logFailedRequest }),
    defaultOptions: {
      queries: { retry: (failures, error) => !(error instanceof NotFoundError) && failures < 2 },
    },
  });
}
