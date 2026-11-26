import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Reads job configs from a directory. A job is found by the `id` inside its file, not by
// the file name, so `job-short` lives in `short.json`.

/** Where the API gets job configs from: the `jobs/` directory, or a fake in tests. */
export interface JobStore {
  /** The first config whose `id` matches, or undefined. */
  find: (id: string) => Promise<unknown>;
  /** Every config, in file-name order. */
  list: () => Promise<unknown[]>;
}

const hasId = (config: unknown, id: string) =>
  typeof config === 'object' && config !== null && 'id' in config && config.id === id;

/** A file that isn't valid JSON is skipped with a warning, so it can't break the other jobs. */
export function jobsFromDirectory(dir: string, warn: (message: string) => void): JobStore {
  // Parses one file at a time, so `find` stops reading at the first match.
  async function* configs() {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
    for (const file of files) {
      try {
        yield JSON.parse(await readFile(join(dir, file), 'utf8')) as unknown;
      } catch (error) {
        warn(`Skipped ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return {
    find: async (id) => {
      for await (const config of configs()) if (hasId(config, id)) return config;
      return undefined;
    },
    list: async () => {
      const all: unknown[] = [];
      for await (const config of configs()) all.push(config);
      return all;
    },
  };
}
