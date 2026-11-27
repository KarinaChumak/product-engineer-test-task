import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { PrequalificationRequest } from '@/shared/prequalification';
import type { JobQuestionnaire, JobSummary } from '@/shared/questionnaire';

/** The server answered 404: there's nothing to retry. */
export class NotFoundError extends Error {}

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

/**
 * Sends the candidate's prequalification answers. Resolves on any 2xx, which says nothing about whether
 * they passed screening and go on to the employer.
 */
export async function submitPrequalification(jobId: string, request: PrequalificationRequest): Promise<void> {
  const url = `/api/jobs/${encodeURIComponent(jobId)}/prequalification`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`POST ${url} returned ${response.status}`);
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
