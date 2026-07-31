/**
 * Shared static Go parsing and hygiene for the code-map generator, the Go
 * adapter, and the Go stack profile. No Go toolchain: plain text reads only.
 *
 * Public Interface:
 * - readGoWorkMembers(repoRoot) -> string[] repo-relative member dirs
 * - readGoModulePath(repoRoot, dir) -> string | null from the go.mod module line
 * - isExcludedGoFile(repoRelPath) -> boolean (vendor/, testdata/, *.pb.go, _test.go)
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const GO_EXCLUDED_DIR_RE = /(^|\/)(vendor|testdata)\//;

/**
 * The single Go file-exclusion policy: vendored, fixture, generated, and test
 * Go files stay out of the symbol index, the endpoint walk, the adapter
 * graph, and the profile fallback. Every consumer imports this — do not copy.
 * @param {string} repoRelPath forward-slash repo-relative path
 * @returns {boolean}
 */
export function isExcludedGoFile(repoRelPath) {
  if (!repoRelPath.endsWith('.go')) {
    return false;
  }
  return (
    GO_EXCLUDED_DIR_RE.test(repoRelPath) ||
    repoRelPath.endsWith('_test.go') ||
    repoRelPath.endsWith('.pb.go')
  );
}

/**
 * Parses `use` directives from a root go.work file: every block form
 * (`use ( ... )`) plus single-line forms. Entries outside the repo (`..`)
 * are dropped; `.` maps to '' (the repo root).
 *
 * @param {string} repoRoot
 * @returns {string[]} repo-relative member dirs
 */
export function readGoWorkMembers(repoRoot) {
  const workFile = path.join(repoRoot, 'go.work');
  if (!existsSync(workFile)) {
    return [];
  }
  const text = readFileSync(workFile, 'utf8').replace(/^﻿/, '');
  /** @type {string[]} */
  const members = [];
  const blockBodies = [...text.matchAll(/^use\s*\(([\s\S]*?)\)/gm)].map(
    (m) => m[1]
  );
  const rawEntries = [
    ...blockBodies.flatMap((body) =>
      body.split('\n').map((line) => line.trim())
    ),
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
  const text = readFileSync(modFile, 'utf8').replace(/^﻿/, '');
  const match = text.match(/^module\s+(\S+)/m);
  return match ? match[1] : null;
}
