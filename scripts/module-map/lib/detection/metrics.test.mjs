import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  modularity,
  internalExternalRatio,
  cohesion,
  coupling,
} from './metrics.mjs';

/** Two cohesive clusters A and B with one weak cross edge. */
const edges = [
  { from: 'a1', to: 'a2', weight: 3 },
  { from: 'a2', to: 'a3', weight: 2 },
  { from: 'a3', to: 'a1', weight: 2 },
  { from: 'b1', to: 'b2', weight: 3 },
  { from: 'b2', to: 'b3', weight: 2 },
  { from: 'b3', to: 'b1', weight: 2 },
  { from: 'a1', to: 'b1', weight: 1 },
];
const good = (f) => (f[0] === 'a' ? 'A' : 'B');
const bad = (f) => (['a1', 'b1', 'a2'].includes(f) ? 'X' : 'Y');

test('cohesive split scores higher than a scrambled one', () => {
  assert.ok(modularity(edges, good) > modularity(edges, bad));
  assert.ok(internalExternalRatio(edges, good) > internalExternalRatio(edges, bad));
});

test('empty edge set scores zero', () => {
  assert.equal(modularity([], good), 0);
  assert.equal(internalExternalRatio([], good), 0);
});

test('cohesion is high within a cluster; coupling counts cross edges', () => {
  assert.ok(cohesion(edges, good, 'A') > 0.5);
  assert.equal(coupling(edges, good, 'A', 'B'), 1);
});

test('unassigned files are ignored', () => {
  const partial = (f) => (f[0] === 'a' ? 'A' : undefined);
  // only the 3 A-internal edges count; the cross edge and B edges are skipped
  assert.equal(internalExternalRatio(edges, partial), 1);
});
