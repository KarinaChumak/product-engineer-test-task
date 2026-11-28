import { expect, test } from '@playwright/test';
import { clearSubmission, readStoredPayload } from './submissions';

test.beforeEach(() => clearSubmission('job-long'));
// Leaves job-long open again for the specs that answer its questions.
test.afterEach(() => clearSubmission('job-long'));

test('job-long stores the README contract payload, with every answer shape and an empty optional left out', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/jobs/job-long');
  // The notice period, German level, salary and years come prefilled from the profile and are kept.
  await expect(page.getByRole('combobox', { name: 'How good is your German?' })).toHaveText('B1');
  await page
    .getByRole('radiogroup', { name: 'Are you allowed to work in the EU?' })
    .getByRole('radio', { name: 'Yes' })
    .check();
  await page.getByRole('textbox', { name: 'Ab wann könnten Sie bei uns starten?' }).fill('2099-03-01');
  const focusAreas = page.getByRole('group', {
    name: 'Which areas would you like to focus on? Pick up to two.',
  });
  await focusAreas.getByRole('checkbox', { name: 'Design systems' }).check();
  await focusAreas.getByRole('checkbox', { name: 'Accessibility' }).check();
  // "Are you willing to relocate to Hamburg?" is optional and left empty.
  await page.getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByRole('heading', { name: 'You don’t fit this job’s requirements' })).toBeVisible();
  expect(await readStoredPayload('job-long')).toEqual({
    job_id: 'job-long',
    answers: [
      { id: 'notice_period', value: '3_months' },
      { id: 'german_level', value: 'B1' },
      { id: 'salary_expectation', value: 95000 },
      { id: 'eu_work_permit', value: true },
      { id: 'starting_date', value: '2099-03-01' },
      { id: 'years_of_experience', value: 6 },
      { id: 'focus_areas', values: ['design_systems', 'accessibility'] },
    ],
    // The profile's 95,000 is above the job's must_be_below of 90,000.
    screening: { passed: false, failed: ['salary_expectation'] },
  });
  expect(errors).toEqual([]);
});
