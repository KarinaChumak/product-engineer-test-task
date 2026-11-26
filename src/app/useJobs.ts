import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/app/api';

/** The list of open jobs as TanStack Query returns it. */
export function useJobs() {
  return useQuery({ queryKey: ['jobs'], queryFn: ({ signal }) => fetchJobs(signal) });
}
