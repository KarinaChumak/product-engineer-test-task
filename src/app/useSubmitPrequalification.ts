import { useMutation } from '@tanstack/react-query';
import { submitPrequalification } from '@/app/api';
import type { PrequalificationRequest } from '@/shared/prequalification';

/** Sends the candidate's prequalification answers for the job. */
export function useSubmitPrequalification(jobId: string) {
  return useMutation({
    mutationFn: (request: PrequalificationRequest) => submitPrequalification(jobId, request),
  });
}
