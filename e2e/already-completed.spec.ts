import { expect, test } from '@playwright/test';
import { clearSubmission } from './submissions';

test.beforeEach(() => clearSubmission('job-short'));
// Leaves job-short open again for the specs that answer its questions.
test.afterEach(() => clearSubmission('job-short'));

test('a job answered once shows as already completed after a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/jobs/job-short');
  const salary = page.getByRole('textbox', { name: 'What is your yearly salary expectation in EUR?' });
  await salary.fill('85000');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your answers have been sent to Kranich Health GmbH' }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole('heading', { name: 'You’ve already answered the questions for this job' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit answers' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
