import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../../../src/init/init.mjs';
import {
  isPathContained,
  isUsageTelemetryEnabled,
  recordUsageEvent,
  resolvePlanningConfig,
  resolveRepoContainedPath,
  resolveRepoRelativePath,
  resolveRuntimeRoot,
  resolveUsageTelemetryDir,
  validatePlanningConfig,
} from '../../../src/init/repo-paths.mjs';
import { validate } from '../../../src/validation/validate.mjs';

const PLUGIN_ROOT = path.resolve(import.meta.dirname, '../../..');

function tempDir(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'plan-product-paths-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function checkJsonSchema(value, rule, label = 'config') {
  if (rule.oneOf) {
    const ok = rule.oneOf.some(branch => {
      try {
        checkJsonSchema(value, branch, label);
        return true;
      } catch {
        return false;
      }
    });
    assert.ok(ok, `${label} failed oneOf`);
    return;
  }
  if (rule.const !== undefined) assert.equal(value, rule.const, label);
  if (rule.type === 'null') {
    assert.equal(value, null, label);
  } else if (rule.type === 'boolean') {
    assert.equal(typeof value, 'boolean', label);
  } else if (rule.type === 'integer') {
    assert.ok(Number.isInteger(value), label);
  } else if (rule.type === 'string') {
    assert.equal(typeof value, 'string', label);
    if (rule.minLength !== undefined) {
      assert.ok(value.length >= rule.minLength, `${label} minLength`);
    }
  } else if (rule.type === 'object') {
    assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), label);
    for (const req of rule.required || []) {
      assert.ok(req in value, `${label}.${req} required`);
    }
    for (const [k, v] of Object.entries(value)) {
      const propRule = rule.properties?.[k];
      if (propRule) {
        checkJsonSchema(v, propRule, `${label}.${k}`);
      } else if (rule.additionalProperties === false) {
        assert.fail(`${label}.${k} unexpected property`);
      } else if (typeof rule.additionalProperties === 'object') {
        checkJsonSchema(v, rule.additionalProperties, `${label}.${k}`);
      }
    }
  }
}

test('isPathContained and resolveRepoContainedPath enforce lexical and symlink repo_root boundaries', t => {
  const repoRoot = tempDir(t);
  const outside = tempDir(t);

  assert.equal(isPathContained(repoRoot, repoRoot), true);
  assert.equal(isPathContained(repoRoot, path.join(repoRoot, 'docs/GLOSSARY.md')), true);
  assert.equal(isPathContained(repoRoot, outside), false);

  assert.equal(
    resolveRepoRelativePath(repoRoot, 'docs\\plans\\development-plan.md', 'paths.developmentPlan'),
    'docs/plans/development-plan.md'
  );

  for (const bad of ['', '   ', '../escape.md', '/etc/passwd']) {
    assert.throws(() => resolveRepoContainedPath(repoRoot, bad, 'paths.product'), /within repo_root/);
  }

  symlinkSync(outside, path.join(repoRoot, 'linked-out'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(
    () => resolveRepoContainedPath(repoRoot, 'linked-out/product.md', 'paths.product'),
    /within repo_root/
  );
});

test('resolvePlanningConfig applies user_home Layer #1 defaults and repo_root Layer #2 overrides', t => {
  const userHome = tempDir(t);
  const repoRoot = tempDir(t);

  const defaults = resolvePlanningConfig(repoRoot, { userHome });
  assert.equal(defaults.paths.glossary, 'docs/GLOSSARY.md');
  assert.equal(defaults.paths.developmentPlan, 'docs/plans/development-plan.md');
  assert.equal(defaults.structure.developmentPlan.idPattern, 'DP-pp.ss');

  mkdirSync(path.join(userHome, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({
      runtimeRoot: '/tmp/org-runtime',
      telemetry: { enabled: true },
      paths: {
        product: 'org-docs/product.md',
        glossary: 'org-docs/GLOSSARY.md',
      },
    })
  );

  const fromUserHome = resolvePlanningConfig(repoRoot, { userHome });
  assert.equal(fromUserHome.paths.product, 'org-docs/product.md');
  assert.equal(fromUserHome.paths.glossary, 'org-docs/GLOSSARY.md');
  assert.equal(fromUserHome.runtimeRoot, '/tmp/org-runtime');
  assert.equal(fromUserHome.telemetry.enabled, true);

  mkdirSync(path.join(repoRoot, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({
      telemetry: { enabled: false },
      paths: {
        product: 'repo-docs/vision.md',
      },
    })
  );

  const merged = resolvePlanningConfig(repoRoot, { userHome });
  assert.equal(merged.paths.product, 'repo-docs/vision.md');
  assert.equal(merged.paths.glossary, 'org-docs/GLOSSARY.md');
  assert.equal(merged.runtimeRoot, '/tmp/org-runtime');
  assert.equal(merged.telemetry.enabled, false);
});

test('schema.json and validatePlanningConfig validate optional runtimeRoot and telemetry.enabled', t => {
  const bundledSchema = JSON.parse(
    readFileSync(path.join(PLUGIN_ROOT, 'skills/plan-product/assets/schema.json'), 'utf8')
  );
  const bundledConfig = JSON.parse(
    readFileSync(path.join(PLUGIN_ROOT, 'skills/plan-product/assets/config.json'), 'utf8')
  );

  for (const validOverlay of [
    {},
    { runtimeRoot: null },
    { runtimeRoot: '.nyssa-ai/plan-product/runtime' },
    { telemetry: {} },
    { telemetry: { enabled: false } },
    { telemetry: { enabled: true }, runtimeRoot: '/srv/runtime' },
  ]) {
    const candidate = { ...bundledConfig, ...validOverlay };
    checkJsonSchema(candidate, bundledSchema, 'config');
    assert.doesNotThrow(() => validatePlanningConfig(candidate, 'config'));
  }

  for (const invalidOverlay of [
    { runtimeRoot: '' },
    { runtimeRoot: 42 },
    { telemetry: null },
    { telemetry: [] },
    { telemetry: 'enabled' },
    { telemetry: { enabled: 'true' } },
    { telemetry: { enabled: true, extra: false } },
    { unexpectedTopKey: true },
  ]) {
    const candidate = { ...bundledConfig, ...invalidOverlay };
    assert.throws(() => checkJsonSchema(candidate, bundledSchema, 'config'));
    assert.throws(() => validatePlanningConfig(candidate, 'config'));
  }
  assert.throws(() => validatePlanningConfig({ ...bundledConfig, runtimeRoot: '   ' }, 'config'));

  // initialize preserves repo_root telemetry while keeping personal user_home runtimeRoot/telemetry out of committed repo config
  const userHome = tempDir(t);
  const repoRoot = tempDir(t);
  mkdirSync(path.join(userHome, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ runtimeRoot: path.join(userHome, 'personal-rt'), telemetry: { enabled: true } })
  );
  initialize(repoRoot, { userHome });
  const writtenRepoConfig = JSON.parse(
    readFileSync(path.join(repoRoot, '.nyssa-ai/plan-product/config.json'), 'utf8')
  );
  assert.equal('runtimeRoot' in writtenRepoConfig, false);
  assert.equal('telemetry' in writtenRepoConfig, false);
  assert.doesNotThrow(() => validate(repoRoot));

  // Invalid telemetry in repo_root config fails validate()
  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ ...writtenRepoConfig, telemetry: { enabled: 'yes' } }, null, 2) + '\n'
  );
  assert.throws(() => validate(repoRoot), /Validation failed/);
});

test('resolveRuntimeRoot and resolveUsageTelemetryDir honor the 4-step runtime_root contract without double-nesting', t => {
  const userHome = tempDir(t);
  const repoRoot = tempDir(t);
  const personaCwd = tempDir(t);
  const partialCwd = tempDir(t);
  const plainCwd = tempDir(t);
  const explicitRt = path.join(tempDir(t), 'custom-runtime');
  const envRt = path.join(tempDir(t), 'env-runtime');
  const personaEnvRt = tempDir(t);

  writeFileSync(path.join(personaCwd, 'SOUL.md'), '# Soul\n');
  writeFileSync(path.join(personaCwd, 'IDENTITY.md'), '# Identity\n');
  writeFileSync(path.join(partialCwd, 'SOUL.md'), '# Soul Only\n');
  writeFileSync(path.join(personaEnvRt, 'SOUL.md'), '# Env Soul\n');
  writeFileSync(path.join(personaEnvRt, 'IDENTITY.md'), '# Env Identity\n');

  // Step 1: explicit --runtime-root
  assert.equal(
    resolveRuntimeRoot(repoRoot, { runtimeRoot: explicitRt, env: { NYSSA_RUNTIME_ROOT: envRt }, cwd: personaCwd, userHome }),
    path.resolve(explicitRt)
  );
  assert.equal(
    resolveUsageTelemetryDir(repoRoot, { runtimeRoot: explicitRt, env: { NYSSA_RUNTIME_ROOT: envRt }, cwd: personaCwd, userHome }),
    path.join(path.resolve(explicitRt), 'usage')
  );

  // Step 2: NYSSA_RUNTIME_ROOT (plain directory vs persona root containing SOUL.md + IDENTITY.md)
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: { NYSSA_RUNTIME_ROOT: envRt }, cwd: personaCwd, userHome }),
    path.resolve(envRt)
  );
  assert.equal(
    resolveUsageTelemetryDir(repoRoot, { env: { NYSSA_RUNTIME_ROOT: envRt }, cwd: personaCwd, userHome }),
    path.join(path.resolve(envRt), 'usage')
  );
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: { NYSSA_RUNTIME_ROOT: personaEnvRt }, cwd: plainCwd, userHome }),
    path.join(personaEnvRt, '.nyssa-ai/plan-product/runtime')
  );
  assert.equal(
    resolveUsageTelemetryDir(repoRoot, { env: { NYSSA_RUNTIME_ROOT: personaEnvRt }, cwd: plainCwd, userHome }),
    path.join(personaEnvRt, '.nyssa-ai/plan-product/runtime/usage')
  );

  // Step 3: persona cwd containing SOUL.md + IDENTITY.md -> <cwd>/.nyssa-ai/plan-product/runtime (already plugin-namespaced)
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: personaCwd, userHome }),
    path.join(personaCwd, '.nyssa-ai/plan-product/runtime')
  );
  assert.equal(
    resolveRuntimeRoot({ env: {}, cwd: personaCwd, userHome, repoRoot }),
    path.join(personaCwd, '.nyssa-ai/plan-product/runtime')
  );
  assert.equal(
    resolveUsageTelemetryDir(repoRoot, { env: {}, cwd: personaCwd, userHome }),
    path.join(personaCwd, '.nyssa-ai/plan-product/runtime/usage')
  );

  // Partial persona marker (SOUL.md without IDENTITY.md) does not trigger Step 3; retired .nyssaai/.nyssa are ignored
  mkdirSync(path.join(repoRoot, '.nyssaai/plan-product'), { recursive: true });
  mkdirSync(path.join(repoRoot, '.nyssa/plan-product'), { recursive: true });
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: partialCwd, userHome }),
    path.join(userHome, '.nyssa-ai/plan-product/runtime')
  );

  // Step 4a: default user_home vs repo_root .nyssa-ai/plan-product/runtime
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.join(userHome, '.nyssa-ai/plan-product/runtime')
  );
  mkdirSync(path.join(repoRoot, '.nyssa-ai/plan-product'), { recursive: true });
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.join(repoRoot, '.nyssa-ai/plan-product/runtime')
  );
  assert.equal(
    resolveUsageTelemetryDir(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.join(repoRoot, '.nyssa-ai/plan-product/runtime/usage')
  );

  // Step 4b: layered config.json runtimeRoot (user_home -> repo_root override, plus null reset)
  const userConfiguredRt = path.join(tempDir(t), 'user-cfg-rt');
  const repoConfiguredRt = path.join(tempDir(t), 'repo-cfg-rt');
  mkdirSync(path.join(userHome, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ runtimeRoot: userConfiguredRt })
  );
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.resolve(userConfiguredRt)
  );
  assert.equal(
    resolveUsageTelemetryDir(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.join(path.resolve(userConfiguredRt), 'usage')
  );

  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ runtimeRoot: repoConfiguredRt })
  );
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.resolve(repoConfiguredRt)
  );

  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ runtimeRoot: null })
  );
  assert.equal(
    resolveRuntimeRoot(repoRoot, { env: {}, cwd: plainCwd, userHome }),
    path.join(repoRoot, '.nyssa-ai/plan-product/runtime')
  );
});

test('isUsageTelemetryEnabled defaults to false and recordUsageEvent writes JSONL only when opted in', t => {
  const userHome = tempDir(t);
  const repoRoot = tempDir(t);
  const plainCwd = tempDir(t);
  const opts = { env: {}, cwd: plainCwd, userHome };

  // Default disabled: zero runtime or usage directories created
  assert.equal(isUsageTelemetryEnabled(repoRoot, opts), false);
  assert.equal(recordUsageEvent(repoRoot, { workflow: 'product', step: 'init' }, opts), null);
  assert.equal(existsSync(path.join(userHome, '.nyssa-ai')), false);
  assert.equal(existsSync(path.join(repoRoot, '.nyssa-ai')), false);

  // Explicit false or non-boolean in config stays disabled
  mkdirSync(path.join(userHome, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ telemetry: { enabled: false } })
  );
  assert.equal(isUsageTelemetryEnabled(repoRoot, opts), false);
  assert.equal(recordUsageEvent(repoRoot, { workflow: 'product' }, opts), null);
  assert.equal(existsSync(path.join(userHome, '.nyssa-ai/plan-product/runtime')), false);

  // Layer #1 user_home enables telemetry
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ telemetry: { enabled: true } })
  );
  assert.equal(isUsageTelemetryEnabled(repoRoot, opts), true);

  // Layer #2 repo_root override to false disables telemetry and keeps repo runtime untouched
  mkdirSync(path.join(repoRoot, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ telemetry: { enabled: false } })
  );
  assert.equal(isUsageTelemetryEnabled(repoRoot, opts), false);
  assert.equal(recordUsageEvent(repoRoot, { workflow: 'feature' }, opts), null);
  assert.equal(existsSync(path.join(repoRoot, '.nyssa-ai/plan-product/runtime')), false);

  // Layer #2 repo_root override to true writes <runtime_root>/usage/events.jsonl
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ telemetry: { enabled: false } })
  );
  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ telemetry: { enabled: true } })
  );
  assert.equal(isUsageTelemetryEnabled(repoRoot, opts), true);

  const firstPath = recordUsageEvent(repoRoot, { workflow: 'product', ok: true }, opts);
  const secondPath = recordUsageEvent(repoRoot, { workflow: 'concept', ok: true }, opts);
  const expectedEventsPath = path.join(repoRoot, '.nyssa-ai/plan-product/runtime/usage/events.jsonl');
  assert.equal(firstPath, expectedEventsPath);
  assert.equal(secondPath, expectedEventsPath);

  const lines = readFileSync(expectedEventsPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(lines, [
    { workflow: 'product', ok: true },
    { workflow: 'concept', ok: true },
  ]);
});
