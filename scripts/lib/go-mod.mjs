/**
 * Shared static go.mod / go.work parsing for the Go adapter and stack profile.
 * No Go toolchain: plain text reads only.
 *
 * Public Interface:
 * - readGoWorkMembers(repoRoot) -> string[] repo-relative member dirs
 * - readGoModulePath(repoRoot, dir) -> string | null from the go.mod module line
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Parses `use` directives from a root go.work file: block form (`use ( ... )`)
 * and single-line form. Entries outside the repo (`..`) are dropped; `.` maps
 * to '' (the repo root).
 *
 * @param {string} repoRoot
 * @returns {string[]} repo-relative member dirs
 */
export function readGoWorkMembers(repoRoot) {
  const workFile = path.join(repoRoot, 'go.work');
  if (!existsSync(workFile)) {
    return [];
  }
  const text = readFileSync(workFile, 'utf8');
  /** @type {string[]} */
  const members = [];
  const blockMatch = text.match(/^use\s*\(([\s\S]*?)\)/m);
  const rawEntries = [
    ...(blockMatch ? blockMatch[1].split('\n').map((line) => line.trim()) : []),
    ...[...text.matchAll(/^use\s+([^\s(][^\n]*)$/gm)].map((m) => m[1]),
  ];
  for (const raw of rawEntries) {
    const entry = raw.replace(/\/\/.*$/, '').trim();
    if (!entry) {
      continue;
    }
    const rel = entry.replace(/^\.\//, '').replace(/\\/g, '/');
    const dir = rel === '.' ? '' : rel;
    if (!dir.startsWith('..') && !members.includes(dir)) {
      members.push(dir);
    }
  }
  return members;
}

/**
 * @param {string} repoRoot
 * @param {string} dir repo-relative module dir ('' for root)
 * @returns {string | null} the go.mod `module` path
 */
export function readGoModulePath(repoRoot, dir) {
  const modFile = path.join(repoRoot, dir, 'go.mod');
  if (!existsSync(modFile)) {
    return null;
  }
  const match = readFileSync(modFile, 'utf8').match(/^module\s+(\S+)/m);
  return match ? match[1] : null;
}
