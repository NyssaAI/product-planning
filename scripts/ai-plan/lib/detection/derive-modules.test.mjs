import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveModules } from './derive-modules.mjs';

/** A nyssa-shaped fixture: two cohesive Api features + a Domain area. */
function fixture() {
  const files = [
    'src/Api/Actors/a1.cs', 'src/Api/Actors/a2.cs', 'src/Api/Actors/a3.cs',
    'src/Api/Mesh/m1.cs', 'src/Api/Mesh/m2.cs', 'src/Api/Mesh/m3.cs',
    'src/Domain/Common/c1.cs', 'src/Domain/Common/c2.cs', 'src/Domain/Common/c3.cs',
  ].map((path) => ({ path, symbols: [] }));
  const e = (from, to) => ({ from, to, weight: 1 });
  const edges = [
    e('src/Api/Actors/a1.cs', 'src/Api/Actors/a2.cs'),
    e('src/Api/Actors/a2.cs', 'src/Api/Actors/a3.cs'),
    e('src/Api/Actors/a3.cs', 'src/Api/Actors/a1.cs'),
    e('src/Api/Mesh/m1.cs', 'src/Api/Mesh/m2.cs'),
    e('src/Api/Mesh/m2.cs', 'src/Api/Mesh/m3.cs'),
    e('src/Api/Mesh/m3.cs', 'src/Api/Mesh/m1.cs'),
    e('src/Domain/Common/c1.cs', 'src/Domain/Common/c2.cs'),
    e('src/Domain/Common/c2.cs', 'src/Domain/Common/c3.cs'),
    e('src/Api/Actors/a1.cs', 'src/Domain/Common/c1.cs'),
  ];
  return { files, edges };
}

test('derives feature-level modules, not one project module', () => {
  const r = deriveModules('.', fixture());
  assert.equal(r.ok, true);
  const roots = r.value.map((m) => m.root);
  assert.ok(roots.includes('src/Api/Actors'));
  assert.ok(roots.includes('src/Api/Mesh'));
  assert.ok(!roots.includes('src/Api')); // not collapsed to the project
});

test('output is deterministic', () => {
  assert.deepEqual(deriveModules('.', fixture()), deriveModules('.', fixture()));
});

test('honors pins — pinned root is authoritative, no sub-derivation', () => {
  const r = deriveModules('.', fixture(), { pins: [{ root: 'src/Api', id: 'api' }] });
  const api = r.value.find((m) => m.root === 'src/Api');
  assert.equal(api?.source, 'pinned');
  assert.ok(!r.value.some((m) => m.root.startsWith('src/Api/')));
});

test('sparse graph falls back to directory structure', () => {
  const { files } = fixture();
  const r = deriveModules('.', { files, edges: [] });
  assert.equal(r.ok, true);
  assert.ok(r.value.some((m) => m.root === 'src')); // coarse fallback
});

test('invalid graph returns a Result failure (no throw)', () => {
  assert.equal(deriveModules('.', null).ok, false);
});

test('produces concise unique ids and symbol-sourced capabilities', () => {
  const f = (path, type) => ({ path, symbols: [{ name: `App.${type}`, kind: 'class', line: 1 }] });
  const files = [
    f('src/Api/Actors/a1.cs', 'ActorSvc'), f('src/Api/Actors/a2.cs', 'ActorRepo'), f('src/Api/Actors/a3.cs', 'ActorModel'),
    f('src/Api/Mesh/m1.cs', 'MeshSvc'), f('src/Api/Mesh/m2.cs', 'MeshRepo'), f('src/Api/Mesh/m3.cs', 'MeshModel'),
  ];
  const e = (a, b) => ({ from: a, to: b, weight: 1 });
  const edges = [
    e('src/Api/Actors/a1.cs', 'src/Api/Actors/a2.cs'), e('src/Api/Actors/a2.cs', 'src/Api/Actors/a3.cs'), e('src/Api/Actors/a3.cs', 'src/Api/Actors/a1.cs'),
    e('src/Api/Mesh/m1.cs', 'src/Api/Mesh/m2.cs'), e('src/Api/Mesh/m2.cs', 'src/Api/Mesh/m3.cs'), e('src/Api/Mesh/m3.cs', 'src/Api/Mesh/m1.cs'),
  ];
  const r = deriveModules('.', { files, edges });
  const actors = r.value.find((m) => m.root === 'src/Api/Actors');
  assert.equal(actors.id, 'api-actors'); // concise: build root dropped
  assert.deepEqual(actors.capabilities, ['ActorModel', 'ActorRepo', 'ActorSvc']); // short symbol names, sorted
  assert.equal(r.value.find((m) => m.root === 'src/Api/Mesh').id, 'api-mesh');
  assert.equal(new Set(r.value.map((m) => m.id)).size, r.value.length); // all unique
});
