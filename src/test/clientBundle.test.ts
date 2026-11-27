// @vitest-environment node
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';

// The client never sees how it's screened: no screening result and no rule or its threshold may end up in
// the code shipped to the browser. Builds the app as for production and searches what it ships.

let outDir: string;
beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'client-bundle-'));
  await build({ logLevel: 'silent', build: { outDir, emptyOutDir: true } });
}, 60_000);
afterAll(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe('the client bundle', () => {
  it('contains no screening result or screening rule', async () => {
    const files = await readdir(outDir, { recursive: true, encoding: 'utf8' });
    const shipped = await Promise.all(
      files.filter((file) => /\.(js|html)$/.test(file)).map((file) => readFile(join(outDir, file), 'utf8')),
    );

    expect(shipped.length).toBeGreaterThan(0);
    for (const code of shipped) expect(code).not.toMatch(/screening|must_?be_?(at_?least|below|true)/i);
  });
});
