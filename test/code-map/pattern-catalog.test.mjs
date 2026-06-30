import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadPatternCatalogs } from '../../scripts/code-map/lib/patterns/catalog.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempProject() {
  const dir = mkdtempSync(path.join(tmpdir(), 'code-indexer-pattern-catalog-'));
  tempDirs.push(dir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

test('loadPatternCatalogs loads bundled JSON catalogs', () => {
  const result = loadPatternCatalogs(process.cwd(), { catalogs: [] });

  assert.ok(result.patterns.length >= 3);
  assert.ok(result.patterns.some((pattern) => pattern.id === 'node-cli-argv-parser'));
  assert.equal(result.patterns.every((pattern) => pattern.source.endsWith('.json')), true);
});

test('loadPatternCatalogs merges repo-defined catalogs without overriding ids', () => {
  const dir = tempProject();
  writeFileSync(
    path.join(dir, 'project.patterns.json'),
    `${JSON.stringify({
      patterns: [
        {
          id: 'project-special-handler',
          name: 'Project special handler',
          language: 'JavaScript',
          confidence: 'medium',
          description: 'Project-specific special handler function.',
          rule: { pattern: 'specialHandler($$$)' },
        },
      ],
    })}\n`,
    'utf8'
  );

  const result = loadPatternCatalogs(dir, {
    catalogs: ['project.patterns.json'],
  });

  assert.ok(result.patterns.some((pattern) => pattern.id === 'project-special-handler'));
});

test('loadPatternCatalogs allows repo catalog to override a builtin pattern id (warn, not throw)', () => {
  const dir = tempProject();
  writeFileSync(
    path.join(dir, 'override.patterns.json'),
    `${JSON.stringify({
      patterns: [
        {
          id: 'node-cli-argv-parser',
          name: 'Override',
          language: 'JavaScript',
          confidence: 'medium',
          description: 'Repo version overrides the builtin.',
          rule: { pattern: 'process.argv.slice($$$)' },
        },
      ],
    })}\n`,
    'utf8'
  );

  const result = loadPatternCatalogs(dir, { catalogs: ['override.patterns.json'] });
  const overridden = result.patterns.find((p) => p.id === 'node-cli-argv-parser');
  assert.equal(overridden?.name, 'Override', 'repo version should win');
  assert.ok(
    result.warnings.some((w) => w.includes('OVERRIDDEN_PATTERN') && w.includes('node-cli-argv-parser')),
    'should emit an OVERRIDDEN_PATTERN warning'
  );
});

test('loadPatternCatalogs rejects invalid confidence tiers', () => {
  const dir = tempProject();
  writeFileSync(
    path.join(dir, 'bad.patterns.json'),
    `${JSON.stringify({
      patterns: [
        {
          id: 'bad-confidence',
          name: 'Bad confidence',
          language: 'JavaScript',
          confidence: 'certain',
          description: 'Invalid confidence.',
          rule: { pattern: 'x()' },
        },
      ],
    })}\n`,
    'utf8'
  );

  assert.throws(
    () => loadPatternCatalogs(dir, { catalogs: ['bad.patterns.json'] }),
    /confidence must be high, medium, or intent-only/
  );
});
