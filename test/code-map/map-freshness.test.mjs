import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { beginMapScan, completeMapScan, checkMapFreshness } from '../../scripts/lib/map-freshness.mjs';
import { runDoctor } from '../../scripts/module-map/lib/doctor.mjs';

function fixture(t) {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'map-freshness-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  for (const dir of ['src', 'docs/code-map/modules', '.plan-product']) mkdirSync(path.join(repo, dir), { recursive: true });
  writeFileSync(path.join(repo, 'plan-product.config.json'), JSON.stringify({ roots: ['src'] }));
  writeFileSync(path.join(repo, '.plan-product/config.json'), '{}');
  writeFileSync(path.join(repo, 'src/index.js'), 'export function hello() {}\n');
  writeFileSync(path.join(repo, 'docs/code-map/code-map.json'), '{"files":[]}\n');
  writeFileSync(path.join(repo, 'docs/code-map/module-map.json'), '{"modules":[{"planningModule":"docs/code-map/modules/src.md"}]}\n');
  writeFileSync(path.join(repo, 'docs/code-map/index.md'), '# Index\n');
  writeFileSync(path.join(repo, 'docs/code-map/modules/src.md'), '# Source\n');
  return repo;
}

test('freshness uses contents, including successful scans with unchanged artifacts', (t) => {
  const repo = fixture(t);
  completeMapScan(repo, beginMapScan(repo));
  const source = path.join(repo, 'src/index.js');
  utimesSync(source, new Date(), new Date(Date.now() + 10000));
  assert.equal(checkMapFreshness(repo).fresh, true, 'touching source is not a change');
  const output = path.join(repo, 'docs/code-map/index.md');
  const before = statSync(output).mtimeMs;
  writeFileSync(source, `${readFileSync(source, 'utf8')}\n`);
  assert.equal(checkMapFreshness(repo).fresh, false);
  completeMapScan(repo, beginMapScan(repo));
  assert.equal(checkMapFreshness(repo).fresh, true);
  assert.equal(statSync(output).mtimeMs, before, 'refresh state does not rewrite unchanged artifacts');
});

test('freshness detects added/deleted sources and configuration and resolver changes', (t) => {
  const repo = fixture(t);
  for (const change of [
    () => writeFileSync(path.join(repo, 'src/new.js'), 'export const added = 1;'),
    () => rmSync(path.join(repo, 'src/new.js')),
    () => writeFileSync(path.join(repo, 'plan-product.config.json'), '{"roots":["src"],"modules":{"minFiles":2}}'),
    () => writeFileSync(path.join(repo, 'tsconfig.json'), '{"compilerOptions":{"baseUrl":"."}}'),
  ]) {
    completeMapScan(repo, beginMapScan(repo));
    change();
    assert.equal(checkMapFreshness(repo).fresh, false);
  }
});

test('checkout line-ending conversion preserves freshness without hiding content changes', (t) => {
  const repo = fixture(t);
  const pluginRoot = path.join(repo, '.temp/plugin');
  mkdirSync(path.join(pluginRoot, 'scripts'), { recursive: true });
  writeFileSync(path.join(pluginRoot, 'package.json'), '{"version":"1"}\n');
  const generator = path.join(pluginRoot, 'scripts/helper.mjs');
  writeFileSync(generator, 'export const label = "caf\u00e9";\n');
  writeFileSync(path.join(repo, 'tsconfig.json'), '{"extends":"./compiler.json"}\n');
  writeFileSync(path.join(repo, 'compiler.json'), '{"compilerOptions":{"baseUrl":"."}}\n');
  const options = { pluginRoot };
  completeMapScan(repo, beginMapScan(repo, options), options);
  for (const file of [
    'src/index.js', 'tsconfig.json', 'compiler.json',
    'docs/code-map/code-map.json', 'docs/code-map/module-map.json',
    'docs/code-map/index.md', 'docs/code-map/modules/src.md',
    '.temp/plugin/package.json', '.temp/plugin/scripts/helper.mjs',
  ]) {
    const absolute = path.join(repo, file);
    writeFileSync(absolute, readFileSync(absolute, 'utf8').replace(/\n/g, '\r\n'));
  }
  assert.equal(checkMapFreshness(repo, options).fresh, true);
  writeFileSync(generator, 'export const label = "changed";\r\n');
  assert.equal(checkMapFreshness(repo, options).fresh, false);

  const binary = path.join(pluginRoot, 'scripts/runtime.bin');
  for (const prefix of [0, 255]) {
    writeFileSync(binary, Buffer.from([prefix, 13, 10]));
    completeMapScan(repo, beginMapScan(repo, options), options);
    writeFileSync(binary, Buffer.from([prefix, 10]));
    assert.equal(checkMapFreshness(repo, options).fresh, false, 'binary bytes remain significant');
  }
});

test('unfinished scans and edits during a scan cannot leave a fresh stamp', (t) => {
  const repo = fixture(t);
  completeMapScan(repo, beginMapScan(repo));
  const before = beginMapScan(repo);
  assert.equal(checkMapFreshness(repo).fresh, false, 'a failed generator never completes the scan');
  writeFileSync(path.join(repo, 'src/index.js'), 'export function changed() {}');
  assert.throws(() => completeMapScan(repo, before), /changed during generation/);
  assert.equal(checkMapFreshness(repo).fresh, false);
});

test('missing or edited core artifacts are stale; optional reports are outside this stamp', (t) => {
  const repo = fixture(t);
  completeMapScan(repo, beginMapScan(repo));
  writeFileSync(path.join(repo, 'docs/code-map/patterns.md'), '# Old optional report');
  writeFileSync(path.join(repo, 'docs/code-map/system-architecture.md'), '# Old optional report');
  assert.equal(checkMapFreshness(repo).fresh, true);
  rmSync(path.join(repo, 'docs/code-map/modules/src.md'));
  assert.equal(checkMapFreshness(repo).fresh, false);
});

test('planning docs and generator changes invalidate the content fingerprint', (t) => {
  const repo = fixture(t);
  const pluginRoot = path.join(repo, '.temp/plugin');
  mkdirSync(path.join(pluginRoot, 'scripts'), { recursive: true });
  writeFileSync(path.join(pluginRoot, 'package.json'), '{"version":"1"}');
  const options = { pluginRoot };
  completeMapScan(repo, beginMapScan(repo, options), options);
  writeFileSync(path.join(repo, 'docs/product.md'), '# Changed product');
  assert.equal(checkMapFreshness(repo, options).fresh, false);
  completeMapScan(repo, beginMapScan(repo, options), options);
  writeFileSync(path.join(pluginRoot, 'scripts/helper.mjs'), 'export const changed = true;');
  assert.equal(checkMapFreshness(repo, options).fresh, false);
});

test('freshness follows inherited compiler configuration, including custom filenames', (t) => {
  const repo = fixture(t);
  mkdirSync(path.join(repo, 'compiler'));
  writeFileSync(path.join(repo, 'tsconfig.json'), '{"extends":"./compiler/options.json"}');
  const inherited = path.join(repo, 'compiler/options.json');
  writeFileSync(inherited, '{"compilerOptions":{"baseUrl":".."}}');
  completeMapScan(repo, beginMapScan(repo));
  writeFileSync(inherited, '{"compilerOptions":{"baseUrl":"../src"}}');
  assert.equal(checkMapFreshness(repo).fresh, false);
});

test('public workflow refreshes the stamp after a source change with no semantic map change', (t) => {
  const repo = fixture(t);
  for (const doc of ['product', 'features', 'tech-stack']) writeFileSync(path.join(repo, `docs/${doc}.md`), `# ${doc}\n`);
  const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const script = path.join(pluginRoot, 'scripts/map-code/generate.mjs');
  const run = () => spawnSync(process.execPath, [script], { cwd: repo, encoding: 'utf8', env: { ...process.env, PLAN_PRODUCT_USAGE: '0' } });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(checkMapFreshness(repo).fresh, true);
  const output = path.join(repo, 'docs/code-map/index.md');
  const before = statSync(output).mtimeMs;
  const source = path.join(repo, 'src/index.js');
  writeFileSync(source, `${readFileSync(source, 'utf8')}\n`);
  assert.equal(checkMapFreshness(repo).fresh, false);
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  assert.equal(statSync(output).mtimeMs, before);
  assert.equal(checkMapFreshness(repo).fresh, true);
});

test('a required dependency scanner failure cannot produce a fresh map', (t) => {
  const repo = fixture(t);
  const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const script = path.join(pluginRoot, 'scripts/map-code/generate.mjs');
  const preload = path.join(repo, '.temp/fail-import.cjs');
  mkdirSync(path.dirname(preload), { recursive: true });
  writeFileSync(preload, `const cp = require('node:child_process');
const original = cp.spawnSync;
cp.spawnSync = (command, args, options) => args?.some(arg => String(arg).includes('plan-product-imports-'))
  ? { status: 2, stdout: '[]', stderr: 'injected import scanner failure' }
  : original(command, args, options);
require('node:module').syncBuiltinESMExports();
`);
  const run = (extra = {}) => spawnSync(process.execPath, [script], { cwd: repo, encoding: 'utf8', env: { ...process.env, PLAN_PRODUCT_USAGE: '0', ...extra } });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(checkMapFreshness(repo).fresh, true);
  const doctor = runDoctor(repo);
  assert.equal(doctor.ok, true, JSON.stringify(doctor.checks));
  assert.ok(doctor.checks.some(check => check.id === 'doc-product' && check.status === 'warn'));
  const failed = run({ NODE_OPTIONS: `--require="${preload.replace(/\\/g, '/')}"` });
  assert.notEqual(failed.status, 0, 'a partial dependency map must fail the public workflow');
  assert.match(failed.stderr, /injected import scanner failure/);
  assert.equal(checkMapFreshness(repo).fresh, false);
});
