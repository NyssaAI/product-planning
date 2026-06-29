import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveDocPath } from './config.mjs';

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').CodeIndexerConfig} config
 */
export function loadProjectBrief(repoRoot, config) {
  /** @type {{ product: string | null, roadmap: string | null, techStack: string | null, excerpts: Record<string, string> }} */
  const result = {
    product: null,
    roadmap: null,
    techStack: null,
    excerpts: {},
  };

  for (const [key, candidates] of Object.entries(config.docs)) {
    const resolved = resolveDocPath(repoRoot, candidates);
    if (!resolved) {
      continue;
    }
    result[key === 'techStack' ? 'techStack' : key] = resolved;
    const text = readFileSync(path.join(repoRoot, resolved), 'utf8');
    result.excerpts[key] = trimDocExcerpt(text, config.briefMaxCharsPerDoc);
  }

  return result;
}

/**
 * @param {string} text
 * @param {number} maxChars
 */
function trimDocExcerpt(text, maxChars) {
  const stripped = text.replace(/^#+\s+/m, '').trim();
  if (stripped.length <= maxChars) {
    return stripped;
  }
  return `${stripped.slice(0, maxChars).trim()}…`;
}

/**
 * Pull bullet lines from tech-stack excerpt for planner conventions.
 * @param {string} techStackExcerpt
 * @returns {string[]}
 */
export function extractConventionsFromTechStack(techStackExcerpt) {
  if (!techStackExcerpt) {
    return [];
  }
  const lines = techStackExcerpt.split('\n');
  /** @type {string[]} */
  const bullets = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+(.+)/);
    if (m && m[1].length > 10 && m[1].length < 200) {
      bullets.push(m[1].trim());
    }
    if (bullets.length >= 8) {
      break;
    }
  }
  return bullets;
}
