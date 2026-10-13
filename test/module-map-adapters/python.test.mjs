import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import pythonAdapter from '../../scripts/module-map/lib/adapters/python.mjs';
import { buildPlanProductModel } from '../../scripts/module-map/lib/build.mjs';
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

function planProductConfig() {
  return {
    projectName: 'python-fixture',
    outputDir: 'docs/code-map',
    codeMapOutput: 'docs/code-map/code-map.json',
    docs: {
      product: ['docs/product.md'],
      features: ['docs/features.md'],
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

test('plan-product model preserves Python adapter dependencies in module graph', () => {
  const graph = pythonAdapter.extract(fixtureRoot, fixtureFiles);
  const model = buildPlanProductModel(fixtureRoot, planProductConfig(), graph.files);
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

test('absolute imports resolve from the deepest shared plausible Python root', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'python-import-root-'));
  const write = (relative, content) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content, 'utf8');
  };

  try {
    write('backend/pyproject.toml', '[project]\nname = "backend"\n');
    write('backend/app/__init__.py', '');
    write('backend/app/service.py', 'from app.models import User\n');
    write('backend/app/models.py', 'class User:\n    pass\n');
    write('other/pyproject.toml', '[project]\nname = "other"\n');
    write('other/app/__init__.py', '');
    write('other/app/models.py', 'class WrongUser:\n    pass\n');

    const files = [
      'backend/app/__init__.py',
      'backend/app/service.py',
      'backend/app/models.py',
      'other/app/__init__.py',
      'other/app/models.py',
    ];
    assert.deepEqual(
      new Set(pythonAdapter.extract(root, files).edges.map(edgeKey)),
      new Set(['backend/app/service.py->backend/app/models.py'])
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Python dependency evidence excludes comments and strings but keeps real multiline imports', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'python-structural-import-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'a.py'), [
    '"""Example:', 'import fake', 'from fake import Thing', 'importlib.import_module("fake")', '"""',
    '# import fake', '# importlib.import_module("fake")',
    'example = \'importlib.import_module("fake")\'',
    'from real import (', '    Thing, # comment', ')',
    'def nested():', '    import real as actual', '    return importlib.import_module("real")',
  ].join('\n'));
  writeFileSync(path.join(root, 'fake.py'), 'class Thing: pass\n');
  writeFileSync(path.join(root, 'real.py'), 'class Thing: pass\n');
  const graph = pythonAdapter.extract(root, ['a.py', 'fake.py', 'real.py']);
  assert.deepEqual(graph.edges, [{ from: 'a.py', to: 'real.py', weight: 3 }]);
  assert.deepEqual(graph.diagnostics, []);
});
