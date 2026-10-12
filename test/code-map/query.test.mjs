import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryCodeMap } from '../../scripts/map-code/query.mjs';

const map = {
  files: [
    { path: 'src/main.mjs', moduleId: 'app', symbols: [{ name: 'run', line: 4 }] },
    { path: 'src/lib.mjs', moduleId: 'lib', symbols: [{ name: 'runTask', line: 2 }] },
  ],
  endpoints: [],
  fileDependencies: [{ from: 'src/main.mjs', to: 'src/lib.mjs', adapter: 'typescript' }],
  coverage: { scannedFileCount: 2, unsupportedFiles: ['src/extra.rb'], diagnostics: [] },
};
test('symbol query returns bounded source evidence with explicit omitted count', () => {
  const result = queryCodeMap(map, 'symbol', 'run', 1);
  assert.equal(result.total, 2);
  assert.equal(result.omitted, 1);
  assert.deepEqual(result.results[0], { kind: 'symbol', file: 'src/main.mjs', moduleId: 'app', name: 'run', line: 4 });
});
test('callers returns incoming file references, including cross-module edges', () => {
  const result = queryCodeMap(map, 'callers', 'src/lib.mjs', 10);
  assert.deepEqual(result.results, [{ kind: 'file-dependency', ...map.fileDependencies[0] }]);
  assert.match(result.meaning, /not symbol calls/);
});
test('module query includes owned zero-symbol files and boundary dependencies', () => {
  const result = queryCodeMap(map, 'module', 'app', 10);
  assert.equal(result.results.filter(r => r.kind === 'file').length, 1);
  assert.equal(result.results.filter(r => r.kind === 'file-dependency').length, 1);
});
test('coverage surfaces omissions without dumping the entire map', () => {
  const result = queryCodeMap(map, 'coverage', '', 10);
  assert.deepEqual(result.results, [{ kind: 'unsupportedFiles', file: 'src/extra.rb' }]);
});

test('module queries can page through every zero-symbol file beyond the result cap', () => {
  const largeMap = { files: Array.from({ length: 201 }, (_, i) => ({ path: `src/${i}.mjs`, moduleId: 'app', symbols: [] })) };
  const first = queryCodeMap(largeMap, 'module', 'app', 200);
  assert.equal(first.nextOffset, 200);
  const last = queryCodeMap(largeMap, 'module', 'app', 200, first.nextOffset);
  assert.equal(last.results.length, 1);
  assert.equal(last.results[0].file, 'src/200.mjs');
  assert.equal(last.nextOffset, null);
  assert.equal(new Set([...first.results, ...last.results].map(row => row.file)).size, 201);
  assert.throws(() => queryCodeMap(largeMap, 'module', 'app', 20, -1), /offset/);
});
