import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  describeMarkerDamage,
  embedModuleMap,
  renderModuleMapTable,
} from '../../scripts/module-map/lib/embed.mjs';

const START = '<!-- plan-product:module-map:start -->';
const END = '<!-- plan-product:module-map:end -->';
const TABLE = renderModuleMapTable([
  { id: 'orders', name: 'orders', description: 'Order intake.', planningModule: 'docs/code-map/modules/orders.md' },
]);

/** @param {import('node:test').TestContext} t */
function repoWith(t, claudeMd) {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'pp-embed-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  writeFileSync(path.join(repo, 'CLAUDE.md'), claudeMd, 'utf8');
  return repo;
}

test('appends the block when markers are absent and replaces a well-formed block', (t) => {
  const repo = repoWith(t, '# Project\n\nUser prose.\n');
  assert.deepEqual(embedModuleMap(repo, TABLE, '2026-01-01T00:00:00.000Z'), ['CLAUDE.md']);
  const first = readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8');
  assert.match(first, /User prose\./);
  assert.equal(first.split(START).length - 1, 1);

  const updated = embedModuleMap(
    repo,
    renderModuleMapTable([
      { id: 'billing', name: 'billing', description: 'Invoices.', planningModule: 'docs/code-map/modules/billing.md' },
    ]),
    '2026-01-02T00:00:00.000Z'
  );
  assert.deepEqual(updated, ['CLAUDE.md']);
  const second = readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8');
  assert.match(second, /User prose\./);
  assert.match(second, /billing/);
  assert.doesNotMatch(second, /orders/);
  assert.equal(second.split(START).length - 1, 1);
});

test('an orphan start marker leaves the file untouched instead of eating user content', (t) => {
  const original = [
    '# Project',
    'IMPORTANT USER CONTENT A',
    START,
    '## Real section',
    'IMPORTANT USER CONTENT B',
    '',
  ].join('\n');
  const repo = repoWith(t, original);

  assert.deepEqual(embedModuleMap(repo, TABLE, '2026-01-01T00:00:00.000Z'), []);
  assert.equal(readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8'), original);
  assert.deepEqual(embedModuleMap(repo, TABLE, '2026-01-02T00:00:00.000Z'), []);
  assert.equal(readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8'), original, 'second run is also a no-op');
});

test('describeMarkerDamage names every inconsistent marker layout', () => {
  assert.equal(describeMarkerDamage('no markers'), null);
  assert.equal(describeMarkerDamage(`${START}\nx\n${END}`), null);
  assert.match(describeMarkerDamage(`${START}\nx`), /end marker missing/);
  assert.match(describeMarkerDamage(`x\n${END}`), /start marker missing/);
  assert.match(describeMarkerDamage(`${END}\n${START}`), /end marker appears before start/);
  assert.match(describeMarkerDamage(`${START}\n${START}\n${END}`), /found 2 start/);
});
