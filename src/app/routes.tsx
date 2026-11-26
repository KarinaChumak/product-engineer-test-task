import { Navigate, type RouteObject } from 'react-router';
import { NotFoundPage } from '@/app/NotFoundPage';
import { QuestionnairePage } from '@/app/QuestionnairePage';

/** `/` opens job-short, `/jobs/<id>` opens that job's questionnaire, and any other path has no job. */
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/jobs/job-short" replace /> },
  { path: '/jobs/:jobId', element: <QuestionnairePage /> },
  { path: '*', element: <NotFoundPage /> },
];
