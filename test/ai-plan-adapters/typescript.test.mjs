import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import typescriptAdapter from '../../scripts/module-map/lib/adapters/typescript.mjs';
import { deriveModules } from '../../scripts/module-map/lib/detection/derive-modules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, 'fixtures', 'typescript-repo');
const nonTsRoot = path.join(__dirname, 'fixtures', 'non-ts-repo');

const fixtureFiles = [
  'src/orders/model.ts',
  'src/orders/service.ts',
  'src/orders/validator.ts',
  'src/shared/index.ts',
  'src/shared/result.ts',
  'src/users/model.ts',
  'src/users/permissions.ts',
  'src/users/service.ts',
];

function edgeKey(edge) {
  return `${edge.from}->${edge.to}`;
}

test('typescript adapter matches TS/Node repos only', () => {
  assert.equal(typescriptAdapter.id, 'typescript');
  assert.equal(typescriptAdapter.matches(fixtureRoot), true);
  assert.equal(typescriptAdapter.matches(nonTsRoot), false);
});

test('typescript adapter resolves relative, index, and tsconfig path imports', () => {
  const graph = typescriptAdapter.extract(fixtureRoot, fixtureFiles);
  const edges = new Map(graph.edges.map((edge) => [edgeKey(edge), edge]));

  assert.equal(
    edges.get('src/orders/service.ts->src/orders/model.ts')?.weight,
    1
  );
  assert.equal(
    edges.get('src/orders/service.ts->src/orders/validator.ts')?.weight,
    2
  );
  assert.equal(
    edges.get('src/orders/service.ts->src/shared/result.ts')?.weight,
    2
  );
  assert.equal(
    edges.get('src/users/service.ts->src/users/model.ts')?.weight,
    1
  );
  assert.equal(
    edges.get('src/users/service.ts->src/users/permissions.ts')?.weight,
    1
  );
  assert.equal(
    edges.get('src/users/service.ts->src/shared/index.ts')?.weight,
    1
  );
  assert.equal(
    graph.edges.some((edge) => edge.to.includes('node_modules')),
    false
  );
});

test('typescript adapter sources exported TypeScript symbols', () => {
  const graph = typescriptAdapter.extract(fixtureRoot, fixtureFiles);
  const byFile = new Map(graph.files.map((file) => [file.path, file.symbols]));

  assert.deepEqual(
    byFile.get('src/orders/model.ts').map((symbol) => symbol.name).sort(),
    ['Order', 'OrderStatus']
  );
  assert.deepEqual(
    byFile.get('src/users/model.ts').map((symbol) => symbol.name).sort(),
    ['User', 'UserRole']
  );
  assert.equal(
    byFile.get('src/orders/service.ts').some((symbol) => symbol.name === 'createOrder'),
    true
  );
});

test('typescript adapter output is byte-stable', () => {
  const first = JSON.stringify(typescriptAdapter.extract(fixtureRoot, fixtureFiles));
  const second = JSON.stringify(typescriptAdapter.extract(fixtureRoot, fixtureFiles));

  assert.equal(first, second);
});

test('typescript adapter graph feeds deriveModules with feature-level modules', () => {
  const graph = typescriptAdapter.extract(fixtureRoot, fixtureFiles);
  const result = deriveModules(fixtureRoot, graph, { minFiles: 1, maxFiles: 3 });

  assert.equal(result.ok, true);
  assert.equal(graph.edges.length >= 5, true);
  assert.deepEqual(
    result.value.map((mod) => mod.root),
    ['src/orders', 'src/shared', 'src/users']
  );
});
