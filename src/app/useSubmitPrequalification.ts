import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlreadyCompletedError, submitPrequalification } from '@/app/api';
import type { PrequalificationRequest } from '@/shared/prequalification';

/** Sends the candidate's prequalification answers for the job. */
export function useSubmitPrequalification(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PrequalificationRequest) => submitPrequalification(jobId, request),
    // After a submit or a 409 the job is completed, so reopening it shows that instead of the questions.
    // Not awaited: the result is on screen without waiting for the reload.
    onSettled: (_, error) => {
      if (error && !(error instanceof AlreadyCompletedError)) return;
      void queryClient.invalidateQueries({ queryKey: ['jobQuestionnaire', jobId] });
    },
  });
}
