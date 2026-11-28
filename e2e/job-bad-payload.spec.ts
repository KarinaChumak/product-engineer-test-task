import { expect, test } from '@playwright/test';
import { clearSubmission, readStoredPayload } from './submissions';

test.beforeEach(() => clearSubmission('job-bad'));
// Leaves job-bad open again for the specs that answer its questions.
test.afterEach(() => clearSubmission('job-bad'));

// A tiny file is enough: the server checks its type and size, not that it's a real PDF.
const coverLetter = Buffer.from('%PDF-1.4 cover letter');

test('job-bad, repaired, stores the README contract payload for every answer shape', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/jobs/job-bad');
  // The repairs show: one notice period (the select), no rating question, and the notice period and
  // salary come prefilled from the profile and are kept.
  await expect(page.getByRole('combobox', { name: 'Kündigungsfrist' })).toHaveText('3 Monate');
  await expect(page.getByText('Wie lange ist Ihre aktuelle Kündigungsfrist')).toHaveCount(0);
  await expect(page.getByText('TypeScript-Kenntnisse')).toHaveCount(0);
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Quick answers.
  await page.getByRole('combobox', { name: 'Anrede' }).click();
  await page.getByRole('option', { name: 'Frau' }).click();
  await page
    .getByRole('radiogroup', { name: /^Haben Sie keine Einwände/ })
    .getByRole('radio', { name: 'Ja' })
    .check();
  await page
    .getByRole('radiogroup', { name: 'Führerschein Klasse B vorhanden?' })
    .getByRole('radio', { name: 'Nein' })
    .check();
  await page.getByRole('textbox', { name: /^Wie viele Jahre Berufserfahrung haben Sie mit React/ }).fill('5');
  const techStack = page.getByRole('group', { name: /^Which of the following technologies/ });
  await techStack.getByRole('checkbox', { name: 'React' }).check();
  await techStack.getByRole('checkbox', { name: 'Vue' }).check();
  await page
    .getByRole('radiogroup', { name: /^Wären Sie grundsätzlich bereit/ })
    .getByRole('radio', { name: 'Ja' })
    .check();
  await page.getByRole('button', { name: 'Weiter' }).click();

  // In your own words.
  await page.getByRole('textbox', { name: 'Aktueller Wohnsitz (Land)' }).fill('Deutschland');
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Anschreiben (bitte ausschließlich als PDF)' }).click();
  await (
    await fileChooser
  ).setFiles({ name: 'Anschreiben.pdf', mimeType: 'application/pdf', buffer: coverLetter });
  await expect(page.getByText('Anschreiben.pdf')).toBeVisible();
  await page.getByRole('textbox', { name: 'Erfahrung mit SAFe?' }).fill('Zwei Jahre in einem SAFe-Zug');
  await page
    .getByRole('textbox', { name: 'Beschreiben Sie Ihre Stärken und Schwächen.' })
    .fill('Stark im Testen.\nUngeduldig in langen Meetings.');
  await page.getByRole('button', { name: 'Antworten absenden' }).click();

  await expect(
    page.getByRole('heading', { name: 'Du erfüllst die Anforderungen dieses Jobs nicht' }),
  ).toBeVisible();
  expect(await readStoredPayload('job-bad')).toEqual({
    job_id: 'job-bad',
    answers: [
      { id: 'notice_period', value: '3_months' },
      { id: 'salutation', value: 'ms' },
      { id: 'country', value: 'Deutschland' },
      { id: 'salary_expectation', value: 95000 },
      { id: 'onsite', value: true },
      { id: 'driving_license', value: false },
      {
        id: 'cover_letter',
        value: {
          content_type: 'application/pdf',
          data: coverLetter.toString('base64'),
          file_name: 'Anschreiben.pdf',
        },
      },
      { id: 'safe', value: 'Zwei Jahre in einem SAFe-Zug' },
      { id: 'strengths_weaknesses', value: 'Stark im Testen.\nUngeduldig in langen Meetings.' },
      { id: 'react_years', value: 5 },
      { id: 'tech_stack', values: ['react', 'vue'] },
      { id: 'availability', value: true },
    ],
    // The profile's 95,000 is above must_be_below 65,000, and there's no driving licence. The text
    // `country` has no rule: its must_be_true was ignored.
    screening: { passed: false, failed: ['salary_expectation', 'driving_license'] },
  });
  expect(errors).toEqual([]);
});
