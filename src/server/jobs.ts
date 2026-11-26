import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Reads job configs from a directory. A job is found by the `id` inside its file, not by
// the file name, so `job-short` lives in `short.json`.

/** Where the API gets job configs from: the `jobs/` directory, or a fake in tests. */
export interface JobStore {
  /** The config whose `id` matches, or undefined. */
  find: (id: string) => Promise<unknown>;
  /** Every config, in file-name order. */
  list: () => Promise<unknown[]>;
}

/** A file that isn't valid JSON is skipped with a warning, so it can't break the other jobs. */
export function jobsFromDirectory(dir: string, warn: (message: string) => void): JobStore {
  const list = async () => {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
    const configs: unknown[] = [];
    for (const file of files) {
      try {
        configs.push(JSON.parse(await readFile(join(dir, file), 'utf8')));
      } catch (error) {
        warn(`Skipped ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return configs;
  };

  return {
    list,
    find: async (id) =>
      (await list()).find(
        (config) => typeof config === 'object' && config !== null && 'id' in config && config.id === id,
      ),
  };
}
