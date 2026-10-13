import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import goAdapter from '../../scripts/module-map/lib/adapters/go.mjs';
import { buildPlanProductModel } from '../../scripts/module-map/lib/build.mjs';
import { selectAdapter } from '../../scripts/module-map/lib/adapters/index.mjs';
import { deriveModules } from '../../scripts/module-map/lib/detection/derive-modules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, 'fixtures', 'go-repo');
const nonGoRoot = path.join(__dirname, 'fixtures', 'non-go-repo');

// Candidate list mimics listRepoFiles output, decoys included, to prove the
// adapter filters vendored, generated, test, and nested-module files itself.
const fixtureFiles = [
  'internal/orders/model.go',
  'internal/orders/orders.pb.go',
  'internal/orders/service.go',
  'internal/orders/service_test.go',
  'internal/shared/result.go',
  'internal/users/model.go',
  'internal/users/service.go',
  'internal/util/util.go',
  'pkg/util/util.go',
  'tools/gen.go',
  'vendor/example.com/dep/dep.go',
];

function edgeKey(edge) {
  return `${edge.from}->${edge.to}`;
}

function planProductConfig() {
  return {
    projectName: 'go-fixture',
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
      adapter: 'go',
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

test('go adapter matches Go repos only and is selectable by id', () => {
  assert.equal(goAdapter.id, 'go');
  assert.equal(goAdapter.matches(fixtureRoot), true);
  // Only go.mod lives under fixtures/, which every walk skips.
  assert.equal(goAdapter.matches(nonGoRoot), false);
  assert.equal(selectAdapter(fixtureRoot, 'go')?.id, 'go');
  assert.equal(selectAdapter(fixtureRoot)?.id, 'go');
});

test('go adapter resolves module-path imports to package-level edges', () => {
  const graph = goAdapter.extract(fixtureRoot, fixtureFiles);
  const edges = new Map(graph.edges.map((edge) => [edgeKey(edge), edge]));

  assert.equal(
    edges.get('internal/orders/model.go->internal/shared/result.go')?.weight,
    1
  );
  assert.equal(
    edges.get('internal/orders/service.go->internal/shared/result.go')?.weight,
    1
  );
  assert.equal(
    edges.get('internal/orders/service.go->internal/users/model.go')?.weight,
    1
  );
  assert.equal(
    edges.get('internal/orders/service.go->internal/users/service.go')?.weight,
    1
  );
  // Blank import is a real side-effect dependency.
  assert.equal(
    edges.get('internal/orders/service.go->internal/util/util.go')?.weight,
    1
  );
  assert.equal(
    edges.get('internal/users/service.go->internal/shared/result.go')?.weight,
    1
  );
  assert.equal(
    edges.get('internal/users/service.go->pkg/util/util.go')?.weight,
    1
  );
  assert.equal(graph.edges.length, 7);
});

test('go adapter excludes vendored, generated, test, and nested-module files', () => {
  const graph = goAdapter.extract(fixtureRoot, fixtureFiles);
  const paths = graph.files.map((file) => file.path);

  assert.equal(paths.includes('vendor/example.com/dep/dep.go'), false);
  assert.equal(paths.includes('internal/orders/orders.pb.go'), false);
  assert.equal(paths.includes('internal/orders/service_test.go'), false);
  // tools/ has its own go.mod: a nested module outside the root module tree.
  assert.equal(paths.includes('tools/gen.go'), false);
  assert.equal(
    graph.edges.some(
      (edge) => edge.from.startsWith('tools/') || edge.to.startsWith('tools/')
    ),
    false
  );
});

test('go adapter sources funcs, methods, structs, and interfaces with 1-based lines', () => {
  const graph = goAdapter.extract(fixtureRoot, fixtureFiles);
  const byFile = new Map(graph.files.map((file) => [file.path, file.symbols]));

  assert.deepEqual(byFile.get('internal/orders/service.go'), [
    { name: 'Service', kind: 'struct', line: 9 },
    { name: 'CreateOrder', kind: 'function', line: 13 },
    { name: 'Create', kind: 'method', line: 17 },
  ]);
  assert.deepEqual(byFile.get('internal/shared/result.go'), [
    { name: 'Result', kind: 'struct', line: 3 },
    { name: 'Validator', kind: 'interface', line: 7 },
  ]);
});

test('go adapter output is byte-stable', () => {
  const first = JSON.stringify(goAdapter.extract(fixtureRoot, fixtureFiles));
  const second = JSON.stringify(goAdapter.extract(fixtureRoot, fixtureFiles));

  assert.equal(first, second);
});

test('go adapter graph feeds deriveModules with package-level modules', () => {
  const graph = goAdapter.extract(fixtureRoot, fixtureFiles);
  const result = deriveModules(fixtureRoot, graph, { minFiles: 1, maxFiles: 4 });

  assert.equal(result.ok, true);
  const roots = result.value.map((mod) => mod.root).sort();
  assert.equal(roots.includes('internal/orders'), true);
  assert.equal(roots.includes('internal/shared'), true);
  assert.equal(roots.includes('internal/users'), true);
  // Colliding package basenames stay distinct modules, resolved by path.
  // deriveModules may roll a single-package tree up to its parent (pkg).
  assert.equal(roots.includes('internal/util'), true);
  assert.equal(
    roots.some((root) => root === 'pkg/util' || root === 'pkg'),
    true
  );
  const ids = result.value.map((mod) => mod.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('plan-product model preserves Go adapter dependencies in module graph', () => {
  const graph = goAdapter.extract(fixtureRoot, fixtureFiles);
  const model = buildPlanProductModel(fixtureRoot, planProductConfig(), graph.files);
  const byRoot = new Map(model.modules.map((mod) => [mod.root, mod]));
  const orders = byRoot.get('internal/orders');
  const shared = byRoot.get('internal/shared');

  assert.notEqual(orders, undefined);
  assert.notEqual(shared, undefined);
  assert.equal(orders.dependsOn.includes(shared.id), true);
  assert.equal(shared.usedBy.includes(orders.id), true);
});

test('go adapter treats independent go.mod subdirs as module roots when no root module exists', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(path.join(tmpdir(), 'go-monorepo-'));
  try {
    for (const [rel, content] of [
      ['services/a/go.mod', 'module example.com/a\n'],
      ['services/a/main.go', 'package main\n\nimport "example.com/a/lib"\n\nfunc main() { lib.Run() }\n'],
      ['services/a/lib/lib.go', 'package lib\n\nfunc Run() {\n}\n'],
      ['services/b/go.mod', 'module example.com/b\n'],
      ['services/b/main.go', 'package main\n\nfunc main() {\n}\n'],
    ]) {
      const file = path.join(dir, rel);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content, 'utf8');
    }

    assert.equal(goAdapter.matches(dir), true);
    const graph = goAdapter.extract(dir, [
      'services/a/main.go',
      'services/a/lib/lib.go',
      'services/b/main.go',
    ]);
    const paths = graph.files.map((file) => file.path);
    assert.deepEqual(paths, [
      'services/a/lib/lib.go',
      'services/a/main.go',
      'services/b/main.go',
    ]);
    assert.equal(
      graph.edges.some(
        (edge) =>
          edge.from === 'services/a/main.go' &&
          edge.to === 'services/a/lib/lib.go'
      ),
      true
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

 test('Go dependency evidence excludes comments and raw strings and keeps import specs', async t => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const root = mkdtempSync(path.join(tmpdir(), 'go-structural-import-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'real')); mkdirSync(path.join(root, 'fake'));
  writeFileSync(path.join(root, 'go.mod'), 'module example.com/demo\n');
  writeFileSync(path.join(root, 'a.go'), ['package main', 'import ( // genuine block', ' _ "example.com/demo/real"', ')', '/*', 'import "example.com/demo/fake"', '*/', 'const example = `', 'import "example.com/demo/fake"', '`'].join('\n'));
  writeFileSync(path.join(root, 'real/b.go'), 'package real\nfunc B() {}\n');
  writeFileSync(path.join(root, 'fake/b.go'), 'package fake\nfunc B() {}\n');
  const graph = goAdapter.extract(root, ['a.go', 'real/b.go', 'fake/b.go']);
  assert.deepEqual(graph.edges, [{ from: 'a.go', to: 'real/b.go', weight: 1 }]);
});
