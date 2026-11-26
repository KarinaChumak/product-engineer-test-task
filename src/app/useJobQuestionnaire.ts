import { useQuery } from '@tanstack/react-query';
import { fetchJobQuestionnaire } from '@/app/api';

/** The job's questionnaire query as TanStack Query returns it. An unknown job fails with `NotFoundError`. */
export function useJobQuestionnaire(jobId: string) {
  return useQuery({
    queryKey: ['jobQuestionnaire', jobId],
    queryFn: ({ signal }) => fetchJobQuestionnaire(jobId, signal),
  });
}
