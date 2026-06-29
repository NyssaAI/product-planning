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
