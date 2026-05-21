import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} [startDir] Directory of the calling script (e.g. code-map toolkit dir).
 * @returns {string | null}
 */
export function findPluginRoot(startDir) {
  for (const key of ['CLAUDE_PLUGIN_ROOT', 'CURSOR_PLUGIN_ROOT']) {
    const raw = process.env[key]?.trim();
    if (raw && existsSync(path.join(raw, '.claude-plugin', 'plugin.json'))) {
      return path.resolve(raw);
    }
    if (raw && existsSync(path.join(raw, '.cursor-plugin', 'plugin.json'))) {
      return path.resolve(raw);
    }
    if (raw) {
      return path.resolve(raw);
    }
  }

  let dir = path.resolve(startDir);
  for (;;) {
    if (
      existsSync(path.join(dir, '.claude-plugin', 'plugin.json')) ||
      existsSync(path.join(dir, '.cursor-plugin', 'plugin.json'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
}
