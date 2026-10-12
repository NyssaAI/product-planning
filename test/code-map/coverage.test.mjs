import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { extractStackGraph } from '../../scripts/module-map/lib/stack-graph.mjs';

const generator = path.resolve('scripts/code-map/generate-code-map.mjs');
function project(t, config) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'map-coverage-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  function put(file, text) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  put('package.json', '{"type":"module"}');
  put('pyproject.toml', '[project]\nname="example"\n');
  if (config) put('plan-product.config.json', JSON.stringify(config));
  return { root, put };
}

test('default inventory includes tools beside tests and zero-symbol files', t => {
  const { root, put } = project(t, { modules: { discover: 'manual', manual: [] } });
  put('test/check.py', 'def test_check(): pass\n');
  put('tools/validate.py', 'print("validate")\n');
  put('scripts/adapter.mjs', 'export default { run: () => 1 };\n');
  put('tools/legacy.rb', 'puts "unmapped"\n');
  const run = spawnSync(process.execPath, [generator], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const map = JSON.parse(readFileSync(path.join(root, 'docs/code-map/code-map.json')));
  assert.deepEqual(map.files.map(f => f.path), ['scripts/adapter.mjs', 'test/check.py', 'tools/validate.py']);
  assert.deepEqual(map.coverage.unsupportedFiles, ['tools/legacy.rb']);
  assert.deepEqual(map.coverage.unownedFiles, map.files.map(f => f.path));
  assert.equal(map.symbols, undefined, 'one canonical symbol representation');
});

test('mixed-language graph retains both languages and respects configured roots', t => {
  const { root, put } = project(t, { roots: ['src'], languages: ['JavaScript', 'Python'] });
  put('src/app/main.mjs', 'import { value } from "../shared/value.mjs";\nconsole.log(value);\n');
  put('src/shared/value.mjs', 'export const value = 1;\n');
  put('src/app/main.py', 'from src.shared.value import value\n');
  put('src/shared/value.py', 'value = 1\n');
  put('outside/ignored.mjs', 'import "../src/shared/value.mjs";\n');
  const stack = extractStackGraph(root);
  assert.deepEqual(stack.graph.files.map(f => f.path).sort(), [
    'src/app/main.mjs', 'src/app/main.py', 'src/shared/value.mjs', 'src/shared/value.py',
  ]);
  assert.deepEqual(stack.graph.edges.map(e => [e.from, e.to]).sort(), [
    ['src/app/main.mjs', 'src/shared/value.mjs'], ['src/app/main.py', 'src/shared/value.py'],
  ]);
});

test('symbols use the same explicit source inventory regardless of ignore files', t => {
  const { root, put } = project(t, { roots: ['src'], modules: { discover: 'manual', manual: [] } });
  mkdirSync(path.join(root, '.git'));
  put('.gitignore', 'src/ignored.js\n');
  put('src/ignored.js', 'export function stillIncluded() {}\n');
  const run = spawnSync(process.execPath, [generator], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const map = JSON.parse(readFileSync(path.join(root, 'docs/code-map/code-map.json')));
  assert.ok(map.files.find(file => file.path === 'src/ignored.js').symbols.some(symbol => symbol.name === 'stillIncluded'));
});
