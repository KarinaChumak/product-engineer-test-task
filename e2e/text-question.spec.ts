import { expect, test } from '@playwright/test';
import { clearSubmission } from './submissions';

test.beforeEach(() => clearSubmission('job-short'));

test('the multiline text question grows with its content', async ({ page }) => {
  await page.goto('/jobs/job-short');
  const project = page.getByRole('textbox', {
    name: 'Which frontend project are you most proud of? 🚀🔥 Tell us what YOU built! 💪',
  });
  await expect(project).toBeVisible();
  const emptyHeight = (await project.boundingBox())!.height;

  await project.fill(
    ['A design system', 'used by six teams', 'with its own docs site', 'and a Figma kit', 'and tests'].join(
      '\n',
    ),
  );

  await expect.poll(async () => (await project.boundingBox())!.height).toBeGreaterThan(emptyHeight);
  // The textarea grew instead of scrolling: none of its text is hidden.
  expect(await project.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
});
