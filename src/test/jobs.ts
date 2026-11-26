import { http, HttpResponse } from 'msw';
import type { JobSummary } from '@/shared/questionnaire';

export const jobList: JobSummary[] = [
  { id: 'job-long', title: 'Senior Frontend Engineer', company: 'Nordlicht Software GmbH' },
  { id: 'job-short', title: 'Frontend Developer (React)', company: 'Kranich Health GmbH' },
];

/** Answers `GET /api/jobs`, which every page asks for to fill the job switcher. */
export const jobListHandler = (jobs: JobSummary[] = jobList) =>
  http.get('/api/jobs', () => HttpResponse.json(jobs));
