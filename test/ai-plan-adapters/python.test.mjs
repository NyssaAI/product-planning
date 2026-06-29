import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pythonAdapter from '../../scripts/module-map/lib/adapters/python.mjs';
import { buildAiPlanModel } from '../../scripts/module-map/lib/build.mjs';
import { selectAdapter } from '../../scripts/module-map/lib/adapters/index.mjs';
import { deriveModules } from '../../scripts/module-map/lib/detection/derive-modules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, 'fixtures', 'python-repo');
const nonPythonRoot = path.join(__dirname, 'fixtures', 'non-python-repo');

const fixtureFiles = [
  'src/orders/__init__.py',
  'src/orders/model.py',
  'src/orders/service.py',
  'src/orders/validator.py',
  'src/shared/__init__.py',
  'src/shared/result.py',
  'src/users/__init__.py',
  'src/users/model.py',
  'src/users/service.py',
];

function edgeKey(edge) {
  return `${edge.from}->${edge.to}`;
}

function aiPlanConfig() {
  return {
    projectName: 'python-fixture',
    outputDir: 'docs/agent-plan/context',
    codeMapOutput: 'docs/agent-plan/context/code-map.json',
    docs: {
      product: ['docs/product.md'],
      roadmap: ['docs/roadmap.md'],
      techStack: ['docs/tech-stack.md'],
    },
    briefMaxCharsPerDoc: 1200,
    modules: {
      discover: 'auto',
      manual: [],
      pinned: [],
      globs: [],
      flows: {},
      adapter: 'python',
      minFiles: 1,
      maxFiles: 4,
    },
    nav: null,
    apiRoutes: {
      enabled: false,
      root: '',
      routeFile: 'route.ts',
      pathPrefix: '',
    },
    conventions: [],
    configFilePresent: false,
  };
}

test('python adapter matches Python repos only and is selectable by id', () => {
  assert.equal(pythonAdapter.id, 'python');
  assert.equal(pythonAdapter.matches(fixtureRoot), true);
  assert.equal(pythonAdapter.matches(nonPythonRoot), false);
  assert.equal(selectAdapter(fixtureRoot, 'python')?.id, 'python');
});

test('python adapter resolves absolute, relative, package, and dynamic imports', () => {
  const graph = pythonAdapter.extract(fixtureRoot, fixtureFiles);
  const edges = new Map(graph.edges.map((edge) => [edgeKey(edge), edge]));

  assert.equal(
    edges.get('src/orders/service.py->src/orders/model.py')?.weight,
    1
  );
  assert.equal(
    edges.get('src/orders/service.py->src/orders/validator.py')?.weight,
    1
  );
  assert.equal(
    edges.get('src/orders/service.py->src/shared/result.py')?.weight,
    2
  );
  assert.equal(
    edges.get('src/orders/service.py->src/users/model.py')?.weight,
    1
  );
  assert.equal(
    edges.get('src/users/service.py->src/users/model.py')?.weight,
    1
  );
  assert.equal(
    edges.get('src/users/service.py->src/shared/__init__.py')?.weight,
    1
  );
});

test('python adapter sources Python classes and functions', () => {
  const graph = pythonAdapter.extract(fixtureRoot, fixtureFiles);
  const byFile = new Map(graph.files.map((file) => [file.path, file.symbols]));

  assert.deepEqual(
    byFile.get('src/orders/model.py').map((symbol) => symbol.name),
    ['Order', '__init__']
  );
  assert.equal(
    byFile.get('src/orders/service.py').some((symbol) => symbol.name === 'create_order'),
    true
  );
});

test('python adapter output is byte-stable', () => {
  const first = JSON.stringify(pythonAdapter.extract(fixtureRoot, fixtureFiles));
  const second = JSON.stringify(pythonAdapter.extract(fixtureRoot, fixtureFiles));

  assert.equal(first, second);
});

test('python adapter graph feeds deriveModules with feature-level modules', () => {
  const graph = pythonAdapter.extract(fixtureRoot, fixtureFiles);
  const result = deriveModules(fixtureRoot, graph, { minFiles: 1, maxFiles: 4 });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.value.map((mod) => mod.root),
    ['src/orders', 'src/shared', 'src/users']
  );
});

test('ai-plan model preserves Python adapter dependencies in module graph', () => {
  const graph = pythonAdapter.extract(fixtureRoot, fixtureFiles);
  const model = buildAiPlanModel(fixtureRoot, aiPlanConfig(), graph.files);
  const moduleEdges = new Set(
    model.moduleGraph.edges.map((edge) => `${edge.from}->${edge.to}`)
  );
  const orders = model.modules.find((mod) => mod.id === 'orders');
  const shared = model.modules.find((mod) => mod.id === 'shared');
  const users = model.modules.find((mod) => mod.id === 'users');

  assert.deepEqual(moduleEdges, new Set(['orders->shared', 'orders->users', 'users->shared']));
  assert.deepEqual(orders.dependsOn, ['shared', 'users']);
  assert.deepEqual(shared.usedBy, ['orders', 'users']);
  assert.deepEqual(users.dependsOn, ['shared']);
});
