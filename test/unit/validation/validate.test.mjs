import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../../../src/init/init.mjs';
import { validate } from '../../../src/validation/validate.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'plan-product-validate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  initialize(root, { userHome: null });
  return root;
}

test('validate enforces docs/ allowed-set lockdown, mandatory GLOSSARY.md, and runtime_root usage boundary', t => {
  const root = fixture(t);
  assert.doesNotThrow(() => validate(root));

  // Disallowed extra file in docs/
  writeFileSync(path.join(root, 'docs/roadmap.md'), '# Legacy\n');
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, 'docs/roadmap.md'));

  // Disallowed directory in docs/
  mkdirSync(path.join(root, 'docs/refinement-plans'), { recursive: true });
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, 'docs/refinement-plans'), { recursive: true, force: true });

  // Disallowed README.md directly under docs/features/
  mkdirSync(path.join(root, 'docs/features'), { recursive: true });
  writeFileSync(path.join(root, 'docs/features/README.md'), '# Extra\n');
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, 'docs/features/README.md'));

  // Missing docs/GLOSSARY.md fails validation
  const glossaryBackup = path.join(root, 'docs/GLOSSARY.md');
  rmSync(glossaryBackup);
  assert.throws(() => validate(root), /Validation failed/);
  initialize(root, { userHome: null });
  assert.doesNotThrow(() => validate(root));

  // Mutable usage directly under .nyssa-ai/plan-product/usage fails, while runtime/usage passes
  mkdirSync(path.join(root, '.nyssa-ai/plan-product/usage'), { recursive: true });
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, '.nyssa-ai/plan-product/usage'), { recursive: true, force: true });

  mkdirSync(path.join(root, '.nyssa-ai/plan-product/runtime/usage'), { recursive: true });
  writeFileSync(path.join(root, '.nyssa-ai/plan-product/runtime/usage/events.jsonl'), '{}\n');
  assert.doesNotThrow(() => validate(root));
});

test('validate permits Canonical in feature titles while banning Surgical, Storage, Ingestion, and Syndication', t => {
  const root = fixture(t);
  mkdirSync(path.join(root, 'docs/features/f-01.01'), { recursive: true });
  const featPath = path.join(root, 'docs/features/f-01.01/feature.md');

  writeFileSync(
    featPath,
    '---\nid: F-01.01\ngroup: "01"\nstatus: planned\n---\n\n# F-01.01 Maintain Canonical Planning Contracts without Losing Notes\n\n## Summary\n Align contracts.\n\n## Conceptual Context\nNone.\n'
  );
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Product Feature Progress\n\n## Feature Checklist Summary\n\n- [ ] F-01.01: Maintain Canonical Planning Contracts without Losing Notes\n\n## Feature Inventory\n\n[Feature Guide](features/f-01.01/feature.md)\n'
  );
  assert.doesNotThrow(() => validate(root));

  // Broken relative link in authored (non-template-only) docs/features.md fails validation
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Product Feature Progress\n\n## Feature Inventory\n\n[Missing Feature](features/f-99.99/feature.md)\n'
  );
  assert.throws(() => validate(root), /Validation failed/);
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Product Feature Progress\n\n## Feature Checklist Summary\n\n- [ ] F-01.01: Maintain Canonical Planning Contracts without Losing Notes\n\n## Feature Inventory\n\n[Feature Guide](features/f-01.01/feature.md)\n'
  );

  for (const bannedWord of ['Surgical', 'Storage', 'Ingestion', 'Syndication']) {
    writeFileSync(
      featPath,
      `---\nid: F-01.01\ngroup: "01"\nstatus: planned\n---\n\n# F-01.01 Perform ${bannedWord} Task Updates\n\n## Summary\nBad title.\n`
    );
    assert.throws(() => validate(root), /Validation failed/, `Expected ${bannedWord} to fail validation`);
  }
});

test('validate enforces Concept Kind (kind: flow | domain-model), bi-directional links, and DP-pp.ss steps', t => {
  const root = fixture(t);
  mkdirSync(path.join(root, 'docs/concepts'), { recursive: true });
  mkdirSync(path.join(root, 'docs/features/f-01.01'), { recursive: true });
  mkdirSync(path.join(root, 'docs/plans'), { recursive: true });

  const cPath = path.join(root, 'docs/concepts/c-01-order-fulfillment.md');
  const fPath = path.join(root, 'docs/features/f-01.01/feature.md');
  const dpPath = path.join(root, 'docs/plans/development-plan.md');

  const validConcept = [
    '---',
    'id: C-01',
    'kind: flow',
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
    '- [F-01.01: Complete Orders with Verified Payment](../features/f-01.01/feature.md) — initiates order.',
    '',
  ].join('\n');

  const validFeature = [
    '---',
    'id: F-01.01',
    'group: "01"',
    'status: planned',
    '---',
    '',
    '# F-01.01 Complete Orders with Verified Payment',
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
    '',
  ].join('\n');

  writeFileSync(cPath, validConcept);
  writeFileSync(fPath, validFeature);
  writeFileSync(
    dpPath,
    '# Development Plan\n\n## Steps\n\n- [ ] DP-01.01: Deliver order checkout — [F-01.01](../features/f-01.01/feature.md)\n    - Verify: complete checkout.\n'
  );
  assert.doesNotThrow(() => validate(root));

  // Retired type: frontmatter fails validation
  writeFileSync(cPath, validConcept.replace('kind: flow', 'type: flow'));
  assert.throws(() => validate(root), /Validation failed/);
  writeFileSync(cPath, validConcept);

  // Missing reciprocal link in feature.md fails validation
  writeFileSync(
    fPath,
    validFeature.replace('- [C-01: Order Fulfillment](../../concepts/c-01-order-fulfillment.md) — initiates order.', 'None.')
  );
  assert.throws(() => validate(root), /Validation failed/);
  writeFileSync(fPath, validFeature);

  // Legacy R-01.01 step ID in development-plan.md fails validation
  writeFileSync(
    dpPath,
    '# Development Plan\n\n## Steps\n\n- [ ] R-01.01: Deliver order checkout — [F-01.01](../features/f-01.01/feature.md)\n'
  );
  assert.throws(() => validate(root), /Validation failed/);
});
