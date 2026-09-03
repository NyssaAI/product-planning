import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const SKILL = 'skills/build-roadmap/SKILL.md';
const CONTRACTS = 'skills/build-roadmap/references/phase-contracts.md';
const COMMAND = 'commands/build-roadmap.md';

test('build-roadmap skill and command ship with the plan-product contract', () => {
  assert.ok(existsSync(SKILL), SKILL);
  assert.ok(existsSync(CONTRACTS), CONTRACTS);
  assert.ok(existsSync(COMMAND), COMMAND);

  const skill = readFileSync(SKILL, 'utf8');
  assert.match(skill, /^name: build-roadmap$/m);

  for (const phrase of [
    'paths\\.roadmap',
    'paths\\.features',
    'paths\\.plans',
    'structure\\.roadmap\\.planNamePattern',
    'structure\\.features\\.featurePathPattern',
    'R-NNN-yyyy\\.mm\\.dd-step-slug\\.md',
    'Roadmap mode',
    'Inventory mode',
    'after:',
    'Plan: none yet',
  ]) {
    assert.match(skill, new RegExp(phrase), phrase);
  }

  const command = readFileSync(COMMAND, 'utf8');
  assert.match(command, /Load the `build-roadmap` skill/);
  assert.match(command, /paths\.roadmap/);
  assert.match(command, /paths\.features/);
  assert.match(command, /never a push or PR/);
});

test('build-roadmap falls back from the roadmap to the feature inventory', () => {
  const skill = readFileSync(SKILL, 'utf8');
  assert.match(skill, /builds from the roadmap when the configured roadmap file exists/);
  assert.match(skill, /Otherwise it builds from the feature inventory/);
  assert.match(skill, /route the user to `plan-product`/);
  assert.match(skill, /do not create one/);
});

test('build-roadmap runs every pipeline phase through the named skills with gates', () => {
  const skill = readFileSync(SKILL, 'utf8');
  const contracts = readFileSync(CONTRACTS, 'utf8');

  for (const invocation of [
    /`ce-plan`/,
    /`ce-doc-review mode:non-interactive <plan path>`/,
    /`ce-work mode:return-to-caller <plan path>`/,
    /`ce-debug mode:pipeline`/,
    /`ce-code-review mode:agent plan:<plan path>`/,
    /`ce-compound mode:non-interactive depth:full`/,
    /map-code\/generate\.mjs/,
    /\$\{PLUGIN_ROOT\}/,
  ]) {
    assert.match(skill, invocation, String(invocation));
  }

  for (const packet of [
    '## plan',
    '## plan-review',
    '## implement',
    '## test',
    '## fix',
    '## code-review',
    '## apply-review',
    '## compound',
    '## codemap',
  ]) {
    assert.ok(contracts.includes(`\n${packet}\n`), packet);
  }

  assert.match(skill, /at most three rounds/);
  assert.match(skill, /plan-revision loop runs at most one/);
  assert.match(contracts, /excludes push/);
  assert.match(contracts, /status: complete/);
});

test('build-roadmap enforces dev-standards and protects roadmap history', () => {
  const skill = readFileSync(SKILL, 'utf8');
  const contracts = readFileSync(CONTRACTS, 'utf8');

  assert.match(skill, /## Dev Standards Enforcement/);
  assert.match(skill, /no flag disables it/);
  assert.match(skill, /`dev-standards:dev-standards`/);
  assert.match(contracts, /## Standards preamble \(every packet\)/);
  assert.match(skill, /Never uncheck a completed slice or feature/);
  assert.match(skill, /never renumber or reuse an ID/);
  assert.match(skill, /Never push, open a pull request, merge, rebase, or force-push/);
  assert.match(skill, /Never work on the default branch/);
});

test('build-roadmap is registered across plugin docs', () => {
  const readme = readFileSync('README.md', 'utf8');
  assert.match(readme, /`build-roadmap`/);
  assert.match(readme, /commands\/build-roadmap\.md/);
  assert.match(readme, /plan-product:build-roadmap/);

  const install = readFileSync('.codex/INSTALL.md', 'utf8');
  assert.match(install, /plan-product:build-roadmap/);

  for (const file of ['CLAUDE.md', 'AGENTS.md']) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /`build-roadmap` - /, file);
  }
});
