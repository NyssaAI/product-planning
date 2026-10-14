import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../scripts/init.mjs';

const names = ['plan-feature','plan-product','plan-roadmap','plan-use-case'];
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const root = path.resolve(import.meta.dirname, '..');

test('all hosts expose the same four planning bundles at version 0.1.0', () => {
  assert.deepEqual(readdirSync('skills').sort(), names);
  assert.deepEqual(readdirSync('commands').sort(), names.map(name => `${name}.md`));
  for (const name of names) {
    const skill = readFileSync(`skills/${name}/SKILL.md`, 'utf8');
    const command = readFileSync(`commands/${name}.md`, 'utf8');
    assert.match(skill, new RegExp(`^---\nname: ${name}\ndescription: .*Use when`, 'm'));
    assert.ok(command.includes(`\`${name}\` skill`));
    for (const [, script] of skill.matchAll(/\$\{PLUGIN_ROOT\}\/(scripts\/[\w/.-]+)/g)) assert.ok(existsSync(script), script);
  }
  for (const file of ['package.json','.claude-plugin/plugin.json','.codex-plugin/plugin.json','.cursor-plugin/plugin.json','gemini-extension.json']) {
    const manifest = json(file);
    assert.equal(manifest.version, '0.1.0', file);
    assert.equal(manifest.name, 'plan-product', file);
  }
  assert.equal(json('package-lock.json').version, '0.1.0');
  assert.deepEqual(Object.keys(json('package-lock.json').packages), ['']);
});

function validate(value, schema, label) {
  if (schema.const !== undefined) assert.equal(value, schema.const, label);
  if (schema.type === 'object') {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), label);
    for (const key of schema.required || []) assert.ok(key in value, `${label}.${key}`);
    for (const [key, child] of Object.entries(value)) {
      const rule = schema.properties?.[key];
      if (rule) validate(child, rule, `${label}.${key}`);
      else if (schema.additionalProperties === false) assert.fail(`${label}.${key} is unexpected`);
      else if (typeof schema.additionalProperties === 'object') validate(child, schema.additionalProperties, `${label}.${key}`);
    }
  } else if (schema.type === 'string') assert.equal(typeof value, 'string', label);
  else if (schema.type === 'integer') assert.ok(Number.isInteger(value), label);
}

test('fresh initialization satisfies the bundled schema and every template resolves', t => {
  const target = mkdtempSync(path.join(os.tmpdir(), 'planning-schema-test-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  initialize(target);
  const config = json(path.join(target, '.plan-product/config.json'));
  validate(config, json('.plan-product/schema.json'), 'config');
  for (const [key, value] of Object.entries(config.paths)) {
    assert.equal(path.isAbsolute(value), false, key);
    if (key.endsWith('Template') || key === 'configSchema') assert.ok(existsSync(path.join(target, value)), key);
  }
});

test('retained decision rubrics remain byte-equivalent in meaning and weight', () => {
  const cases = json('evals/product-planning/cases.json');
  const baseline = json('evals/product-planning/baseline.json');
  for (const [id, expected] of Object.entries(baseline.scenarioSha256)) {
    const row = cases.content.find(row => row.id === id);
    assert.ok(row, id);
    const digest = createHash('sha256').update(JSON.stringify(row)).digest('hex');
    assert.equal(digest, expected, id);
  }
});

test('evaluation preparation packages all scenarios and declares usable local fixtures', t => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'planning-eval-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const target = path.join(temp, 'prepared');
  execFileSync(process.execPath, ['evals/product-planning/prepare.mjs', root, target]);
  assert.equal(readdirSync(path.join(target, 'routing')).length, 12);
  assert.equal(readdirSync(path.join(target, 'content')).length, 8);
  for (const row of json('evals/product-planning/cases.json').content) {
    const folder = path.join(target, 'content', row.id);
    assert.equal(json(path.join(folder, 'criteria.json')).checklist.reduce((sum, c) => sum + c.max_score, 0), 100);
    if (row.files) {
      assert.equal(json(path.join(folder, 'scenario.json')).fixtures.project.installPath, '.');
      for (const [file, content] of Object.entries(row.files)) assert.equal(readFileSync(path.join(folder, 'fixture', file), 'utf8'), content);
    }
  }
  assert.throws(() => execFileSync(process.execPath, ['evals/product-planning/prepare.mjs', root, target], { stdio: 'pipe' }));
});

test('release package contains only the planning runtime and initializes without dependencies', t => {
  const npm = process.env.npm_execpath;
  assert.ok(npm, 'Run the suite with npm test so the installed npm CLI is available');
  const temp = mkdtempSync(path.join(os.tmpdir(), 'planning-package-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const output = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
  const pack = Array.isArray(output) ? output[0] : output['plan-product'];
  const files = pack.files.map(row => row.path).sort();
  assert.deepEqual(files.filter(file => file.startsWith('scripts/')), ['scripts/init.mjs','scripts/lib/repo-paths.mjs']);
  assert.deepEqual(files.filter(file => file.startsWith('skills/')), names.map(name => `skills/${name}/SKILL.md`));
  assert.deepEqual(files.filter(file => file.startsWith('commands/')), names.map(name => `commands/${name}.md`));
  assert.equal(files.some(file => file.startsWith('test/') || file.startsWith('evals/') || file.startsWith('.temp/')), false);
  const installed = path.join(temp, 'installed');
  for (const file of files) {
    const target = path.join(installed, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, file), target);
  }
  const project = path.join(temp, 'project');
  mkdirSync(project);
  execFileSync(process.execPath, [path.join(installed, 'scripts/init.mjs')], { cwd: project });
  assert.ok(existsSync(path.join(project, '.plan-product/config.json')));
});
