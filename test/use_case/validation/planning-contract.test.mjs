import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../../../src/init/init.mjs';
import { validate as validateRepo } from '../../../src/validation/validate.mjs';

const commandNames = ['plan-concept', 'plan-development', 'plan-feature', 'plan-maintain', 'plan-product', 'plan-use-case'];
const workflowNames = ['concept', 'development-plan', 'feature', 'maintain', 'product', 'use-case'];
const root = path.resolve(import.meta.dirname, '../../..');
const json = rel => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));

test('all hosts expose the plan-product facade, 6 workflows, and 6 commands with matching version', () => {
  assert.deepEqual(readdirSync(path.join(root, 'skills')).sort(), ['plan-product']);
  assert.deepEqual(
    readdirSync(path.join(root, 'skills/plan-product/workflows')).sort(),
    workflowNames.map(w => `${w}.md`)
  );
  assert.deepEqual(
    readdirSync(path.join(root, 'commands')).sort(),
    commandNames.map(name => `${name}.md`)
  );

  const facade = readFileSync(path.join(root, 'skills/plan-product/SKILL.md'), 'utf8');
  assert.match(facade, new RegExp('^---\nname: plan-product\ndescription: [\\s\\S]*Use this skill when', 'm'));
  assert.ok(facade.includes('> [!IMPORTANT] Scope Directive'));

  for (const name of commandNames) {
    const command = readFileSync(path.join(root, `commands/${name}.md`), 'utf8');
    assert.ok(command.includes('`plan-product`'));
  }
  for (const w of workflowNames) {
    const workflow = readFileSync(path.join(root, `skills/plan-product/workflows/${w}.md`), 'utf8');
    assert.ok(workflow.includes('> [!IMPORTANT] Scope Directive'));
    for (const [, modPath] of workflow.matchAll(/\$\{PLUGIN_ROOT\}\/((?:src|scripts)\/[\w/.-]+)/g)) {
      assert.ok(existsSync(path.join(root, modPath)), modPath);
    }
  }

  const rootManifest = json('plugin.json');
  assert.equal(rootManifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(typeof rootManifest.repository, 'string');
  for (const file of [
    'plugin.json',
    'package.json',
    '.claude-plugin/plugin.json',
    '.codex-plugin/plugin.json',
    '.cursor-plugin/plugin.json',
    'gemini-extension.json',
  ]) {
    const manifest = json(file);
    assert.equal(manifest.version, rootManifest.version, file);
    assert.equal(manifest.name, 'plan-product', file);
  }
  const tesslManifest = json('.tessl-plugin/plugin.json');
  assert.equal(tesslManifest.version, rootManifest.version);
  assert.equal(tesslManifest.name, 'nyssa-ai/plan-product');
  assert.equal(tesslManifest.skills, 'skills');
  assert.equal(json('package-lock.json').version, rootManifest.version);
  assert.deepEqual(Object.keys(json('package-lock.json').packages), ['']);
  assert.equal(
    readFileSync(path.join(root, 'AGENTS.md'), 'utf8'),
    readFileSync(path.join(root, 'CLAUDE.md'), 'utf8')
  );
});

test('active skills, workflows, commands, templates, docs, and evals align with locked UL and 5-root contracts', () => {
  const activeFiles = [
    'README.md',
    'AGENTS.md',
    'CLAUDE.md',
    'skills/plan-product/SKILL.md',
    ...workflowNames.map(w => `skills/plan-product/workflows/${w}.md`),
    ...commandNames.map(c => `commands/${c}.md`),
    'skills/plan-product/assets/templates/development-plan.md',
    'skills/plan-product/assets/templates/glossary.md',
    'skills/plan-product/assets/templates/features.md',
    'skills/plan-product/assets/templates/concept.md',
    'evals/LATEST.md',
    'evals/scenarios/product-planning/README.md',
    'evals/scenarios/product-planning/cases.json',
    'evals/waza/skills/plan-product/tasks/in-scope.yaml',
  ];
  for (const rel of activeFiles) {
    const content = readFileSync(path.join(root, rel), 'utf8');
    assert.doesNotMatch(content, /\bce-plan\b|compound-engineering/i, `${rel} must not reference retired Compound Engineering`);
    assert.doesNotMatch(content, /\.codegraph\b/, `${rel} must check docs/code-map/codegraph.db instead of .codegraph`);
    assert.doesNotMatch(content, /\btargetRoot\b|<target-repo>|<project-root>/, `${rel} must use repo_root instead of retired root names`);
  }
});

test('material feature and use-case writes offer a non-blocking development plan handoff', () => {
  for (const workflowName of ['feature', 'use-case']) {
    const workflow = readFileSync(path.join(root, `skills/plan-product/workflows/${workflowName}.md`), 'utf8');
    assert.ok(workflow.includes('### 4. Optional Development Plan Handoff'), workflowName);
    assert.ok(workflow.includes('Would you like to update the development plan now?'), workflowName);
    assert.ok(workflow.includes('Would you like to create the development plan now?'), workflowName);
    assert.ok(workflow.includes('If the user says yes, load `workflows/development-plan.md` in the same conversation.'), workflowName);
    assert.ok(workflow.includes('Do not treat development plan work as a blocking condition'), workflowName);
    assert.ok(workflow.includes('Do not ask after a read-only review, an unchanged write, or a cancelled update.'), workflowName);
  }
});

function validateSchema(value, schema, label) {
  if (schema.const !== undefined) assert.equal(value, schema.const, label);
  if (schema.type === 'object') {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), label);
    for (const key of schema.required || []) assert.ok(key in value, `${label}.${key}`);
    for (const [key, child] of Object.entries(value)) {
      const rule = schema.properties?.[key];
      if (rule) validateSchema(child, rule, `${label}.${key}`);
      else if (schema.additionalProperties === false) assert.fail(`${label}.${key} is unexpected`);
      else if (typeof schema.additionalProperties === 'object') validateSchema(child, schema.additionalProperties, `${label}.${key}`);
    }
  } else if (schema.type === 'string') assert.equal(typeof value, 'string', label);
  else if (schema.type === 'integer') assert.ok(Number.isInteger(value), label);
}

test('fresh initialization satisfies the bundled schema and every template resolves', t => {
  const target = mkdtempSync(path.join(os.tmpdir(), 'planning-schema-test-'));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  initialize(target, { userHome: null });
  const config = JSON.parse(readFileSync(path.join(target, '.nyssa-ai/plan-product/config.json'), 'utf8'));
  validateSchema(config, json('skills/plan-product/assets/schema.json'), 'config');
  for (const [key, value] of Object.entries(config.paths)) {
    assert.equal(path.isAbsolute(value), false, key);
    if (key.endsWith('Template') || key === 'configSchema') {
      assert.ok(existsSync(path.join(target, value)), key);
    }
  }
});

test('all Model v2 content rubrics are locked in baseline.json and remain byte-equivalent', () => {
  const cases = json('evals/scenarios/product-planning/cases.json');
  const baseline = json('evals/scenarios/product-planning/baseline.json');
  assert.equal(baseline.modelVersion, 2);
  assert.deepEqual(Object.keys(baseline.scenarioSha256).sort(), cases.content.map(row => row.id).sort());
  for (const [id, expected] of Object.entries(baseline.scenarioSha256)) {
    const row = cases.content.find(r => r.id === id);
    assert.ok(row, id);
    const digest = createHash('sha256').update(JSON.stringify(row)).digest('hex');
    assert.equal(digest, expected, id);
  }
});

test('evaluation preparation packages src/, skills/, commands/, and all 48 routing + 14 content scenarios', t => {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'planning-eval-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const target = path.join(temp, 'prepared');
  execFileSync(process.execPath, [path.join(root, 'evals/scenarios/product-planning/prepare.mjs'), root, target]);
  assert.equal(readdirSync(path.join(target, 'routing')).length, 48);
  assert.equal(readdirSync(path.join(target, 'content')).length, 14);
  assert.ok(existsSync(path.join(target, 'src/init/init.mjs')));
  for (const row of json('evals/scenarios/product-planning/cases.json').content) {
    const folder = path.join(target, 'content', row.id);
    const criteria = JSON.parse(readFileSync(path.join(folder, 'criteria.json'), 'utf8'));
    assert.equal(criteria.checklist.reduce((sum, c) => sum + c.max_score, 0), 100);
    if (row.files) {
      const scenario = JSON.parse(readFileSync(path.join(folder, 'scenario.json'), 'utf8'));
      assert.equal(scenario.fixtures.project.installPath, '.');
      for (const [file, content] of Object.entries(row.files)) {
        assert.equal(readFileSync(path.join(folder, 'fixture', file), 'utf8'), content);
      }
    }
  }
  assert.throws(() => execFileSync(process.execPath, [path.join(root, 'evals/scenarios/product-planning/prepare.mjs'), root, target], { stdio: 'pipe' }));
});

test('release package ships Scale A src/ runtime and initializes without dependencies', t => {
  const npm = process.env.npm_execpath;
  assert.ok(npm, 'Run the suite with npm test so the installed npm CLI is available');
  const temp = mkdtempSync(path.join(os.tmpdir(), 'planning-package-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const output = JSON.parse(execFileSync(process.execPath, [npm, 'pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }));
  const pack = Array.isArray(output) ? output[0] : output['plan-product'];
  const files = pack.files.map(row => row.path).sort();

  assert.deepEqual(files.filter(file => file.startsWith('scripts/')), ['scripts/assemble.mjs']);
  assert.deepEqual(
    files.filter(file => file.startsWith('src/')),
    ['src/init/init.mjs', 'src/init/repo-paths.mjs', 'src/migration/migrate.mjs', 'src/validation/validate.mjs']
  );
  assert.deepEqual(
    files.filter(file => file.startsWith('skills/plan-product/workflows/')),
    workflowNames.map(w => `skills/plan-product/workflows/${w}.md`)
  );
  assert.ok(files.includes('skills/plan-product/SKILL.md'));
  assert.ok(files.includes('skills/plan-product/assets/config.json'));
  assert.ok(files.includes('skills/plan-product/assets/schema.json'));
  assert.ok(files.includes('skills/plan-product/assets/templates/glossary.md'));
  assert.ok(files.includes('skills/plan-product/assets/templates/development-plan.md'));
  assert.deepEqual(files.filter(file => file.startsWith('commands/')), commandNames.map(name => `commands/${name}.md`));
  assert.equal(
    files.some(file => file.startsWith('test/') || file.startsWith('evals/') || file.startsWith('docs/') || file.startsWith('.temp/') || file.startsWith('.nyssa-ai/')),
    false
  );

  const installed = path.join(temp, 'installed');
  for (const file of files) {
    const target = path.join(installed, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, file), target);
  }
  const project = path.join(temp, 'project');
  mkdirSync(project);
  execFileSync(process.execPath, [path.join(installed, 'src/init/init.mjs')], { cwd: project });
  assert.ok(existsSync(path.join(project, '.nyssa-ai/plan-product/config.json')));
  assert.ok(existsSync(path.join(project, '.nyssa-ai/plan-product/templates/glossary.md')));
  assert.ok(existsSync(path.join(project, '.nyssa-ai/plan-product/templates/development-plan.md')));
  assert.ok(existsSync(path.join(project, 'docs/GLOSSARY.md')));
});

test('product-planning repository itself passes full validate() checks', () => {
  assert.doesNotThrow(() => validateRepo(root));
});
