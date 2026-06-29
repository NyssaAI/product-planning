import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModuleEdges } from '../../scripts/module-map/lib/module-deps.mjs';

/**
 * Three modules where `a` imports `b` (adapter edge) and also declares a
 * workspace dependency on `c` via package name `c-pkg`.
 */
function modules() {
  return [
    { id: 'a', name: 'a', root: 'a', packageDependencies: ['c-pkg'] },
    { id: 'b', name: 'b', root: 'b', packageDependencies: [] },
    { id: 'c', name: 'c-pkg', root: 'c', packageDependencies: [] },
  ];
}

/** Inject a pre-extracted adapter graph so the test needs no filesystem. */
function stackWithEdges(edges) {
  return { adapter: null, graph: { files: [], edges } };
}

test('adapter edges and package-dependency edges are both preserved', () => {
  const stack = stackWithEdges([{ from: 'a/x.ts', to: 'b/y.ts' }]);
  const edges = buildModuleEdges('/repo', modules(), undefined, stack);

  // a->b comes from the adapter graph; a->c comes from a's packageDependencies.
  assert.deepEqual(edges, [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'c' },
  ]);
});

test('adapter edges are deduped and self-edges dropped', () => {
  const stack = stackWithEdges([
    { from: 'a/x.ts', to: 'b/y.ts' },
    { from: 'a/x.ts', to: 'b/z.ts' }, // duplicate a->b
    { from: 'a/x.ts', to: 'a/w.ts' }, // self-edge a->a
  ]);
  const noPkgDeps = modules().map((m) => ({ ...m, packageDependencies: [] }));
  const edges = buildModuleEdges('/repo', noPkgDeps, undefined, stack);

  assert.deepEqual(edges, [{ from: 'a', to: 'b' }]);
});
