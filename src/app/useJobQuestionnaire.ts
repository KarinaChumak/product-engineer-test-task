import { useQuery } from '@tanstack/react-query';
import { fetchJobQuestionnaire } from '@/app/api';

/** The query key of a job's questionnaire, for anything that has to reload it. */
export const jobQuestionnaireKey = (jobId: string) => ['jobQuestionnaire', jobId];

/** The job's questionnaire query as TanStack Query returns it. An unknown job fails with `NotFoundError`. */
export function useJobQuestionnaire(jobId: string) {
  return useQuery({
    queryKey: jobQuestionnaireKey(jobId),
    queryFn: ({ signal }) => fetchJobQuestionnaire(jobId, signal),
  });
}
