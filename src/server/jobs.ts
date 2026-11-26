import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Reads job configs from a directory. A job is found by the `id` inside its file, not by
// the file name, so `job-short` lives in `short.json`.

export type JobSource = (id: string) => Promise<unknown>;

export function jobsFromDirectory(dir: string): JobSource {
  return async (id) => {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
    for (const file of files) {
      const config: unknown = JSON.parse(await readFile(join(dir, file), 'utf8'));
      if (typeof config === 'object' && config !== null && 'id' in config && config.id === id) return config;
    }
    return undefined;
  };
}
