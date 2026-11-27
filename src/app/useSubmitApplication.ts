import { useMutation } from '@tanstack/react-query';
import { submitApplication } from '@/app/api';
import type { ApplicationRequest } from '@/shared/application';

/** Sends the candidate's application to the job. */
export function useSubmitApplication(jobId: string) {
  return useMutation({ mutationFn: (request: ApplicationRequest) => submitApplication(jobId, request) });
}
