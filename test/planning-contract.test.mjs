import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../scripts/init.mjs';
import { validate as validateRepo } from '../scripts/validate.mjs';

const commandNames = ['plan-concept','plan-feature','plan-maintain','plan-product','plan-roadmap','plan-use-case'];
const workflowNames = ['concept','feature','maintain','product','roadmap','use-case'];
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const root = path.resolve(import.meta.dirname, '..');

test('all hosts expose the plan-product facade and matching commands with matching version', () => {
  assert.deepEqual(readdirSync('skills').sort(), ['plan-product']);
  assert.deepEqual(readdirSync('skills/plan-product/workflows').sort(), workflowNames.map(w => `${w}.md`));
  assert.deepEqual(readdirSync('commands').sort(), commandNames.map(name => `${name}.md`));

  const facade = readFileSync('skills/plan-product/SKILL.md', 'utf8');
  assert.match(facade, new RegExp('^---\nname: plan-product\ndescription: [\\s\\S]*Use this skill when', 'm'));
  assert.ok(facade.includes('> [!IMPORTANT] Scope Directive'));

  for (const name of commandNames) {
    const command = readFileSync(`commands/${name}.md`, 'utf8');
    assert.ok(command.includes('`plan-product`'));
  }
  for (const w of workflowNames) {
    const workflow = readFileSync(`skills/plan-product/workflows/${w}.md`, 'utf8');
    assert.ok(workflow.includes('> [!IMPORTANT] Scope Directive'));
    for (const [, script] of workflow.matchAll(/\$\{PLUGIN_ROOT\}\/(scripts\/[\w/.-]+)/g)) assert.ok(existsSync(script), script);
  }
  const rootManifest = json('plugin.json');
  for (const file of ['plugin.json', 'package.json','.claude-plugin/plugin.json','.codex-plugin/plugin.json','.cursor-plugin/plugin.json','gemini-extension.json']) {
    const manifest = json(file);
    assert.equal(manifest.version, rootManifest.version, file);
    assert.equal(manifest.name, 'plan-product', file);
  }
  assert.equal(json('package-lock.json').version, rootManifest.version);
  assert.deepEqual(Object.keys(json('package-lock.json').packages), ['']);
});

test('material feature and use-case writes offer a non-blocking roadmap handoff', () => {
  for (const workflowName of ['feature', 'use-case']) {
    const workflow = readFileSync(`skills/plan-product/workflows/${workflowName}.md`, 'utf8');
    assert.ok(workflow.includes('### 4. Optional Roadmap Handoff'), workflowName);
    assert.ok(workflow.includes('Would you like to update the roadmap now?'), workflowName);
    assert.ok(workflow.includes('Would you like to create the roadmap now?'), workflowName);
    assert.ok(workflow.includes('If the user says yes, load `workflows/roadmap.md` in the same conversation.'), workflowName);
    assert.ok(workflow.includes('Do not treat roadmap work as a blocking condition'), workflowName);
    assert.ok(workflow.includes('Do not ask after a read-only review, an unchanged write, or a cancelled update.'), workflowName);
  }
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
  const config = json(path.join(target, '.nyssa-ai/plan-product/config.json'));
  validate(config, json('skills/plan-product/assets/schema.json'), 'config');
  for (const [key, value] of Object.entries(config.paths)) {
    assert.equal(path.isAbsolute(value), false, key);
    if (key.endsWith('Template') || key === 'configSchema') assert.ok(existsSync(path.join(target, value)), key);
  }
});

test('all Model v2 content rubrics are locked in baseline.json and remain byte-equivalent', () => {
  const cases = json('evals/scenarios/product-planning/cases.json');
  const baseline = json('evals/scenarios/product-planning/baseline.json');
  assert.equal(baseline.modelVersion, 2);
  assert.deepEqual(Object.keys(baseline.scenarioSha256).sort(), cases.content.map(row => row.id).sort());
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
  execFileSync(process.execPath, ['evals/scenarios/product-planning/prepare.mjs', root, target]);
  assert.equal(readdirSync(path.join(target, 'routing')).length, 48);
  assert.equal(readdirSync(path.join(target, 'content')).length, 14);
  for (const row of json('evals/scenarios/product-planning/cases.json').content) {
    const folder = path.join(target, 'content', row.id);
    assert.equal(json(path.join(folder, 'criteria.json')).checklist.reduce((sum, c) => sum + c.max_score, 0), 100);
    if (row.files) {
      assert.equal(json(path.join(folder, 'scenario.json')).fixtures.project.installPath, '.');
      for (const [file, content] of Object.entries(row.files)) assert.equal(readFileSync(path.join(folder, 'fixture', file), 'utf8'), content);
    }
  }
  assert.throws(() => execFileSync(process.execPath, ['evals/scenarios/product-planning/prepare.mjs', root, target], { stdio: 'pipe' }));
});

test('release package contains only the planning runtime and initializes without dependencies', t => {
  const npm = process.env.npm_execpath;
  assert.ok(npm, 'Run the suite with npm test so the installed npm CLI is available');
  const temp = mkdtempSync(path.join(os.tmpdir(), 'planning-package-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const output = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }));
  const pack = Array.isArray(output) ? output[0] : output['plan-product'];
  const files = pack.files.map(row => row.path).sort();
  assert.deepEqual(files.filter(file => file.startsWith('scripts/')), ['scripts/assemble.mjs','scripts/init.mjs','scripts/lib/repo-paths.mjs','scripts/migrate.mjs','scripts/validate.mjs']);
  assert.deepEqual(files.filter(file => file.startsWith('skills/plan-product/workflows/')), workflowNames.map(w => `skills/plan-product/workflows/${w}.md`));
  assert.ok(files.includes('skills/plan-product/SKILL.md'));
  assert.ok(files.includes('skills/plan-product/assets/config.json'));
  assert.ok(files.includes('skills/plan-product/assets/schema.json'));
  assert.ok(files.includes('skills/plan-product/assets/templates/concept.md'));
  assert.deepEqual(files.filter(file => file.startsWith('commands/')), commandNames.map(name => `commands/${name}.md`));
  assert.equal(files.some(file => file.startsWith('test/') || file.startsWith('evals/') || file.startsWith('.temp/') || file.startsWith('.nyssa-ai/')), false);
  const installed = path.join(temp, 'installed');
  for (const file of files) {
    const target = path.join(installed, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, file), target);
  }
  const project = path.join(temp, 'project');
  mkdirSync(project);
  execFileSync(process.execPath, [path.join(installed, 'scripts/init.mjs')], { cwd: project });
  assert.ok(existsSync(path.join(project, '.nyssa-ai/plan-product/config.json')));
  assert.ok(existsSync(path.join(project, '.nyssa-ai/plan-product/templates/concept.md')));
});

test('validate checks concept frontmatter, sequence numbering, and bi-directional feature links', t => {
  const target = mkdtempSync(path.join(os.tmpdir(), 'planning-concept-validate-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  initialize(target);
  mkdirSync(path.join(target, 'docs/concepts'), { recursive: true });
  mkdirSync(path.join(target, 'docs/features/f-01.01'), { recursive: true });

  const validConcept = [
    '---',
    'id: C-01',
    'type: flow',
    'status: active',
    '---',
    '',
    '# C-01: Order Fulfillment',
    '',
    '## Summary',
    'End-to-end order lifecycle.',
    '',
    '## Core Model / Stages',
    '- Draft -> Paid -> Shipped',
    '',
    '## Invariants & Rules',
    '- Cannot cancel after shipping.',
    '',
    '## Participating Features',
    '- [F-01.01: Checkout](../features/f-01.01/feature.md) — initiates order.',
    ''
  ].join('\n');

  const validFeature = [
    '---',
    'id: F-01.01',
    'group: "01"',
    'status: planned',
    '---',
    '',
    '# F-01.01 Checkout',
    '',
    '## Summary',
    'Customer checkout.',
    '',
    '## User Need',
    'Buy items.',
    '',
    '## Conceptual Context',
    '- [C-01: Order Fulfillment](../../concepts/c-01-order-fulfillment.md) — initiates order.',
    '',
    '## Use Cases',
    'None yet.',
    ''
  ].join('\n');

  const cPath = path.join(target, 'docs/concepts/c-01-order-fulfillment.md');
  const fPath = path.join(target, 'docs/features/f-01.01/feature.md');
  cpSync(path.join(root, 'skills/plan-product/assets/templates/concept.md'), cPath);
  // Write valid bi-directional pair
  writeFileSync(cPath, validConcept);
  writeFileSync(fPath, validFeature);
  assert.doesNotThrow(() => validateRepo(target));

  // Missing reciprocal link in feature.md should fail validation
  writeFileSync(fPath, validFeature.replace('- [C-01: Order Fulfillment](../../concepts/c-01-order-fulfillment.md) — initiates order.', 'None.'));
  assert.throws(() => validateRepo(target), /Validation failed/);
});
