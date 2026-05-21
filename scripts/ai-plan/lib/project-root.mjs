import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} [startDir]
 * @returns {string}
 */
export function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(dir, 'ai-plan.config.json'))) {
      return dir;
    }
    if (existsSync(path.join(dir, 'code-map.config.json'))) {
      return dir;
    }
    if (existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return path.resolve(startDir);
    }
    dir = parent;
  }
}
