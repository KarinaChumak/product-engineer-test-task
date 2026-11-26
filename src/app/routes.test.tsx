import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderAt } from '@/test/render';
import { server } from '@/test/server';

// Each test answers only the job it expects, so a request for any other job fails it.
function serveJob(id: string) {
  server.use(
    http.get(`/api/jobs/${id}/questionnaire`, () =>
      HttpResponse.json({ id, title: `Title of ${id}`, company: 'Acme', language: 'en', questions: [] }),
    ),
  );
}

describe('routes', () => {
  it('opens job-short at /', async () => {
    serveJob('job-short');
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Title of job-short' })).toBeInTheDocument();
  });

  it('opens the job named in /jobs/<id>', async () => {
    serveJob('job-long');
    renderAt('/jobs/job-long');

    expect(await screen.findByRole('heading', { name: 'Title of job-long' })).toBeInTheDocument();
  });

  it('shows "job not found" for a path that names no job, without a request', () => {
    renderAt('/settings');

    expect(screen.getByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
  });
});
