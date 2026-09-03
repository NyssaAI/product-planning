import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import typescriptAdapter from '../../scripts/module-map/lib/adapters/typescript.mjs';

/** @type {string[]} */
const tempDirs = [];

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ts-import-test-'));
  tempDirs.push(dir);
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '0.0.0' }),
    'utf8'
  );
  return dir;
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

function edgeSet(graph) {
  return new Set(graph.edges.map((e) => `${e.from}->${e.to}`));
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('structural extraction: require() creates a dependency edge (regex missed it)', () => {
  const root = repo();
  write(root, 'src/a.ts', `const b = require('./b');\nexport const a = 1;\n`);
  write(root, 'src/b.ts', `export const b = 2;\n`);

  const graph = typescriptAdapter.extract(root, ['src/a.ts', 'src/b.ts']);
  assert.equal(edgeSet(graph).has('src/a.ts->src/b.ts'), true);
});

test('structural extraction: imports in comments and strings do not create edges', () => {
  const root = repo();
  write(
    root,
    'src/a.ts',
    [
      `import { real } from './b';`,
      `// import ghost from './c';`,
      `const s = "import phantom from './c'";`,
      `export const a = 1;`,
    ].join('\n')
  );
  write(root, 'src/b.ts', `export const real = 2;\n`);
  write(root, 'src/c.ts', `export const c = 3;\n`);

  const graph = typescriptAdapter.extract(root, [
    'src/a.ts',
    'src/b.ts',
    'src/c.ts',
  ]);
  const edges = edgeSet(graph);
  // Real import resolves.
  assert.equal(edges.has('src/a.ts->src/b.ts'), true);
  // The commented-out and stringified imports must NOT produce an edge to c.
  assert.equal(edges.has('src/a.ts->src/c.ts'), false);
});

test('structural extraction: dynamic import() and re-export still create edges', () => {
  const root = repo();
  write(
    root,
    'src/a.ts',
    `const c = await import('./c');\nexport { d } from './d';\n`
  );
  write(root, 'src/c.ts', `export const c = 1;\n`);
  write(root, 'src/d.ts', `export const d = 2;\n`);

  const graph = typescriptAdapter.extract(root, [
    'src/a.ts',
    'src/c.ts',
    'src/d.ts',
  ]);
  const edges = edgeSet(graph);
  assert.equal(edges.has('src/a.ts->src/c.ts'), true);
  assert.equal(edges.has('src/a.ts->src/d.ts'), true);
});

test('NodeNext emitted extensions resolve to their TypeScript source files', () => {
  const root = repo();
  write(
    root,
    'src/a.ts',
    [
      `import './b.js';`,
      `import './view.jsx';`,
      `import './module.mjs';`,
      `import './common.cjs';`,
    ].join('\n')
  );
  write(root, 'src/b.ts', `export const b = 1;\n`);
  write(root, 'src/view.tsx', `export const view = 1;\n`);
  write(root, 'src/module.mts', `export const moduleValue = 1;\n`);
  write(root, 'src/common.cts', `export const common = 1;\n`);

  const edges = edgeSet(
    typescriptAdapter.extract(root, [
      'src/a.ts',
      'src/b.ts',
      'src/view.tsx',
      'src/module.mts',
      'src/common.cts',
    ])
  );
  assert.deepEqual(
    edges,
    new Set([
      'src/a.ts->src/b.ts',
      'src/a.ts->src/common.cts',
      'src/a.ts->src/module.mts',
      'src/a.ts->src/view.tsx',
    ])
  );
});

test('root package self-references resolve to source', () => {
  const root = repo();
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', main: './dist/index.js' }),
    'utf8'
  );
  write(root, 'src/consumer.ts', `import { value } from 'fixture';\n`);
  write(root, 'src/index.ts', `export const value = 1;\n`);

  const edges = edgeSet(
    typescriptAdapter.extract(root, ['src/consumer.ts', 'src/index.ts'])
  );
  assert.equal(edges.has('src/consumer.ts->src/index.ts'), true);
});

test('workspace packages fall back from dist entries to source and package indexes', () => {
  const root = repo();
  write(
    root,
    'packages/source/package.json',
    JSON.stringify({ name: '@fixture/source', main: 'dist/index.js' })
  );
  write(root, 'packages/source/src/index.mjs', `export const source = 1;\n`);
  write(
    root,
    'packages/root/package.json',
    JSON.stringify({ name: '@fixture/root', main: 'dist/index.js' })
  );
  write(root, 'packages/root/index.js', `export const rootValue = 1;\n`);
  write(
    root,
    'packages/typed/package.json',
    JSON.stringify({
      name: '@fixture/typed',
      main: 'dist/index.js',
      typings: 'source/public.ts',
    })
  );
  write(root, 'packages/typed/source/public.ts', `export const typed = 1;\n`);
  write(
    root,
    'src/consumer.ts',
    [
      `import '@fixture/source';`,
      `import '@fixture/root';`,
      `import '@fixture/typed';`,
    ].join('\n')
  );

  const files = [
    'src/consumer.ts',
    'packages/source/src/index.mjs',
    'packages/root/index.js',
    'packages/typed/source/public.ts',
  ];
  assert.deepEqual(
    edgeSet(typescriptAdapter.extract(root, files)),
    new Set([
      'src/consumer.ts->packages/root/index.js',
      'src/consumer.ts->packages/source/src/index.mjs',
      'src/consumer.ts->packages/typed/source/public.ts',
    ])
  );
});

test('adapter matches JS-only package repos outside skipped directories', () => {
  const root = repo();
  write(root, 'src/index.mjs', `export const value = 1;\n`);
  assert.equal(typescriptAdapter.matches(root), true);

  const skippedRoot = repo();
  write(skippedRoot, 'fixtures/index.js', `export const fixture = 1;\n`);
  assert.equal(typescriptAdapter.matches(skippedRoot), false);
});
