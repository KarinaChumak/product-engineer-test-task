// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Screens and their wiring in src/app compose components from src/components and define no
// CSS of their own: every style lives in a small, reusable component.
const appFiles = readdirSync('src/app', { recursive: true, encoding: 'utf8' }).map((file) =>
  join('src/app', file),
);

describe('src/app', () => {
  it('has no stylesheets', () => {
    expect(appFiles.filter((file) => /\.css$/.test(file))).toEqual([]);
  });

  it('sets no className or style on elements', () => {
    const styled = appFiles
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => /\b(className|style)=/.test(readFileSync(file, 'utf8')));
    expect(styled).toEqual([]);
  });
});

// Tests mock the network with MSW (`server.use` from @/test/server) and never silence the
// console: a warning or error fails the test, so the code under test must not log one.
const testFiles = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((file) => /\.test\.tsx?$/.test(file))
  .map((file) => join('src', file));

describe('tests', () => {
  it.each([
    ['spy on the console', /spyOn\(\s*console\b/],
    ['stub fetch', /stubGlobal\(\s*['"]fetch['"]/],
  ])('never %s', (_, pattern) => {
    expect(testFiles.filter((file) => pattern.test(readFileSync(file, 'utf8')))).toEqual([]);
  });
});
