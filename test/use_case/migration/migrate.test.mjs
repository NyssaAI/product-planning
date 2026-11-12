import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../../../src/init/init.mjs';
import { migrate } from '../../../src/migration/migrate.mjs';
import { validate } from '../../../src/validation/validate.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'product-planning-migrate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('migrate upgrades Model v1 (.plan-product, F-101, UC-001, docs/roadmap.md R-001) to canonical Model v2 development-plan', t => {
  const root = fixture(t);
  const v1Config = {
    version: 1,
    paths: {
      repoRoot: '.',
      product: 'docs/product.md',
      features: 'docs/features.md',
      techStack: 'docs/tech-stack.md',
      featureDocs: 'docs/features',
      roadmap: 'docs/roadmap.md',
    },
    structure: {
      features: {
        inventory: 'docs/features.md',
        root: 'docs/features',
        idPattern: 'F-Nxx',
        folderPattern: 'f-nxx',
        featureFile: 'feature.md',
        featurePathPattern: 'docs/features/f-nxx/feature.md',
        useCaseIdPattern: 'UC-nnn',
        useCaseFilePattern: 'uc-nnn-short-slug.md',
        useCasePathPattern: 'docs/features/f-nxx/uc-nnn-short-slug.md',
      },
      roadmap: {
        file: 'docs/roadmap.md',
        idPattern: 'R-NNN',
      },
    },
  };
  mkdirSync(path.join(root, '.plan-product'), { recursive: true });
  writeFileSync(path.join(root, '.plan-product/config.json'), JSON.stringify(v1Config));
  mkdirSync(path.join(root, 'docs/features/f-101'), { recursive: true });
  writeFileSync(
    path.join(root, 'docs/features/f-101/feature.md'),
    '---\nid: F-101\nphase: 1\nstatus: planned\n---\n\n# F-101 Sign In with Protected Session\n\n## Use Case\n- [UC-001: Login](uc-001-login.md)\n'
  );
  writeFileSync(
    path.join(root, 'docs/features/f-101/uc-001-login.md'),
    '---\nfeature: F-101\nid: UC-001\nstatus: planned\n---\n\n# UC-001 Login\n'
  );
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Features\n\n| Delivery Phase | Complete |\n| --- | --- |\n\n### Phase 1 - Auth\n- [ ] F-101: [Sign In with Protected Session](features/f-101/feature.md)\n'
  );
  writeFileSync(
    path.join(root, 'docs/roadmap.md'),
    '# Roadmap\n\n## Slices\n- [ ] R-001: First slice — [F-101](features/f-101/feature.md)\n    - Verify: sign in.\n'
  );

  assert.throws(() => initialize(root, { userHome: null }), /legacy/i);

  const result = migrate(root);
  assert.equal(result.configUpgraded, true);
  assert.equal(result.featuresMigrated.length, 1);
  assert.equal(result.featuresMigrated[0].newId, 'F-01.01');
  assert.equal(result.useCasesMigrated.length, 1);
  assert.equal(result.useCasesMigrated[0].newUcId, 'UC-01.01.01');

  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/config.json')));
  assert.equal(existsSync(path.join(root, '.plan-product')), false);
  assert.equal(existsSync(path.join(root, 'docs/roadmap.md')), false);
  assert.ok(existsSync(path.join(root, 'docs/plans/development-plan.md')));
  assert.ok(existsSync(path.join(root, 'docs/features/f-01.01/feature.md')));
  assert.ok(existsSync(path.join(root, 'docs/features/f-01.01/uc-01.01.01-login.md')));

  const dpContent = readFileSync(path.join(root, 'docs/plans/development-plan.md'), 'utf8');
  assert.match(dpContent, /# Development Plan/);
  assert.match(dpContent, /## Steps/);
  assert.match(dpContent, /DP-01\.01:/);
  assert.match(dpContent, /\[F-01\.01\]\(\.\.\/features\/f-01\.01\/feature\.md\)/);

  const initRes = initialize(root, { userHome: null });
  assert.ok(initRes.created.includes('docs/GLOSSARY.md'));
  assert.ok(initRes.created.includes('.nyssa-ai/plan-product/templates/glossary.md'));
  assert.ok(initRes.created.includes('.nyssa-ai/plan-product/templates/development-plan.md'));
  assert.doesNotThrow(() => validate(root));
});

test('migrate upgrades legacy Model v2 docs/roadmap.md (R-pp.ss), concept type:, and usage/ telemetry to canonical v2', t => {
  const root = fixture(t);
  mkdirSync(path.join(root, '.nyssa-ai/plan-product/usage'), { recursive: true });
  writeFileSync(path.join(root, '.nyssa-ai/plan-product/usage/telemetry.json'), '{"runs":1}\n');
  writeFileSync(
    path.join(root, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({
      version: 2,
      paths: {
        repoRoot: '.',
        product: 'docs/product.md',
        features: 'docs/features.md',
        techStack: 'docs/tech-stack.md',
        featureDocs: 'docs/features',
        concepts: 'docs/concepts',
        roadmap: 'docs/roadmap.md',
        roadmapTemplate: '.nyssa-ai/plan-product/templates/roadmap.md',
      },
      structure: {
        roadmap: { file: 'docs/roadmap.md', idPattern: 'R-pp.ss' },
      },
    })
  );
  mkdirSync(path.join(root, 'docs/concepts'), { recursive: true });
  mkdirSync(path.join(root, 'docs/features/f-01.01'), { recursive: true });
  writeFileSync(
    path.join(root, 'docs/concepts/c-01-shift-flow.md'),
    '---\nid: C-01\ntype: flow\nstatus: active\n---\n\n# C-01: Shift Flow\n\n## Participating Features\n- [F-01.01](../features/f-01.01/feature.md)\n'
  );
  writeFileSync(
    path.join(root, 'docs/features/f-01.01/feature.md'),
    '---\nid: F-01.01\ngroup: "01"\nstatus: planned\n---\n\n# F-01.01 Exchange Shifts with Coordinator Approval\n\n## Conceptual Context\n- [C-01](../../concepts/c-01-shift-flow.md)\n'
  );
  writeFileSync(
    path.join(root, 'docs/roadmap.md'),
    '# Product Roadmap\n\n- [ ] R-01.01: Exchange shifts — [F-01.01](features/f-01.01/feature.md)\n    - Concepts: [C-01](concepts/c-01-shift-flow.md)\n    - Verify: swap shift.\n'
  );

  migrate(root);
  initialize(root, { userHome: null });

  assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/usage')), false);
  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/runtime/usage/telemetry.json')));
  assert.equal(existsSync(path.join(root, 'docs/roadmap.md')), false);

  const conceptText = readFileSync(path.join(root, 'docs/concepts/c-01-shift-flow.md'), 'utf8');
  assert.match(conceptText, /^kind: flow$/m);
  assert.doesNotMatch(conceptText, /^type:/m);

  const dpText = readFileSync(path.join(root, 'docs/plans/development-plan.md'), 'utf8');
  assert.match(dpText, /DP-01\.01:/);
  assert.match(dpText, /\(\.\.\/features\/f-01\.01\/feature\.md\)/);
  assert.match(dpText, /\(\.\.\/concepts\/c-01-shift-flow\.md\)/);

  assert.doesNotThrow(() => validate(root));
});
