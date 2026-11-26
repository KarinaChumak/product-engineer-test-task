import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Reads job configs from a directory. A job is found by the `id` inside its file, not by
// the file name, so `job-short` lives in `short.json`.

export type JobSource = (id: string) => Promise<unknown>;

/** A file that isn't valid JSON is skipped with a warning, so it can't break the other jobs. */
export function jobsFromDirectory(dir: string, warn: (message: string) => void): JobSource {
  return async (id) => {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
    for (const file of files) {
      let config: unknown;
      try {
        config = JSON.parse(await readFile(join(dir, file), 'utf8'));
      } catch (error) {
        warn(`Skipped ${file}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
      if (typeof config === 'object' && config !== null && 'id' in config && config.id === id) return config;
    }
    return undefined;
  };
}
