import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isPathContained,
  resolveRepoContainedPath,
  resolveRepoRelativePath,
  resolvePlanningConfig,
  resolveRuntimeRoot,
  resolveUsageTelemetryDir,
} from '../../../src/init/repo-paths.mjs';

function tempDir(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'plan-product-paths-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
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
      paths: {
        product: 'org-docs/product.md',
        glossary: 'org-docs/GLOSSARY.md',
      },
    })
  );

  const fromUserHome = resolvePlanningConfig(repoRoot, { userHome });
  assert.equal(fromUserHome.paths.product, 'org-docs/product.md');
  assert.equal(fromUserHome.paths.glossary, 'org-docs/GLOSSARY.md');

  mkdirSync(path.join(repoRoot, '.nyssa-ai/plan-product'), { recursive: true });
  writeFileSync(
    path.join(repoRoot, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({
      paths: {
        product: 'repo-docs/vision.md',
      },
    })
  );

  const merged = resolvePlanningConfig(repoRoot, { userHome });
  assert.equal(merged.paths.product, 'repo-docs/vision.md');
  assert.equal(merged.paths.glossary, 'org-docs/GLOSSARY.md');
});

test('resolveRuntimeRoot and resolveUsageTelemetryDir honor the 4-step runtime_root contract', t => {
  const userHome = tempDir(t);
  const repoRoot = tempDir(t);
  const personaCwd = tempDir(t);
  const explicitRt = path.join(tempDir(t), 'custom-runtime');
  const envRt = path.join(tempDir(t), 'env-runtime');

  // Step 1: explicit --runtime-root
  assert.equal(
    resolveRuntimeRoot({ runtimeRoot: explicitRt, env: { NYSSA_RUNTIME_ROOT: envRt }, cwd: personaCwd, userHome, repoRoot }),
    path.resolve(explicitRt)
  );

  // Step 2: NYSSA_RUNTIME_ROOT
  assert.equal(
    resolveRuntimeRoot({ env: { NYSSA_RUNTIME_ROOT: envRt }, cwd: personaCwd, userHome, repoRoot }),
    path.resolve(envRt)
  );

  // Step 3: persona cwd containing SOUL.md + IDENTITY.md
  writeFileSync(path.join(personaCwd, 'SOUL.md'), '# Soul\n');
  writeFileSync(path.join(personaCwd, 'IDENTITY.md'), '# Identity\n');
  assert.equal(
    resolveRuntimeRoot({ env: {}, cwd: personaCwd, userHome, repoRoot }),
    path.resolve(personaCwd)
  );
  assert.equal(
    resolveUsageTelemetryDir({ env: {}, cwd: personaCwd, userHome, repoRoot }),
    path.join(personaCwd, '.nyssa-ai/plan-product/runtime/usage')
  );

  // Step 4: default repo_root or user_home .nyssa-ai/plan-product/runtime/
  const plainCwd = tempDir(t);
  assert.equal(
    resolveRuntimeRoot({ env: {}, cwd: plainCwd, userHome, repoRoot }),
    path.join(userHome, '.nyssa-ai/plan-product/runtime')
  );
  mkdirSync(path.join(repoRoot, '.nyssa-ai/plan-product'), { recursive: true });
  assert.equal(
    resolveRuntimeRoot({ env: {}, cwd: plainCwd, userHome, repoRoot }),
    path.join(repoRoot, '.nyssa-ai/plan-product/runtime')
  );
  assert.equal(
    resolveUsageTelemetryDir({ env: {}, cwd: plainCwd, userHome, repoRoot }),
    path.join(repoRoot, '.nyssa-ai/plan-product/runtime/usage')
  );
});
