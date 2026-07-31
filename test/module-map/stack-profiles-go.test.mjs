import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detectStackModules } from '../../scripts/module-map/lib/stack-profiles/index.mjs';

/** @type {string[]} */
const tempDirs = [];

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'go-profile-test-'));
  tempDirs.push(dir);
  return dir;
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

function config() {
  return { modules: { flows: {} } };
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('goProfile derives package-level modules with collision-safe ids', () => {
  const dir = repo();
  write(dir, 'go.mod', 'module example.com/app\n');
  write(dir, 'internal/orders/service.go', 'package orders\n');
  write(dir, 'internal/util/util.go', 'package util\n');
  write(dir, 'pkg/util/util.go', 'package util\n');
  // Decoys the profile must skip: shared BASE skip dirs and Go hygiene.
  write(dir, 'fixtures/sample/main.go', 'package main\n');
  write(dir, 'dist/gen.go', 'package gen\n');
  write(dir, 'internal/orders/service_test.go', 'package orders\n');
  write(dir, 'tools/go.mod', 'module example.com/tools\n');
  write(dir, 'tools/gen.go', 'package main\n');

  const modules = detectStackModules(dir, config());
  const roots = modules.map((mod) => mod.root);
  assert.deepEqual(roots, ['internal/orders', 'internal/util', 'pkg/util']);
  const ids = modules.map((mod) => mod.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.includes('util'), true);
  assert.equal(ids.includes('pkg-util'), true);
});

test('goProfile includes go.work members and fires without a root go.mod', () => {
  const dir = repo();
  write(dir, 'go.work', 'go 1.22\n\nuse (\n\t./svc-a\n)\n\nuse ./svc-b\n');
  write(dir, 'svc-a/go.mod', 'module example.com/svc-a\n');
  write(dir, 'svc-a/api/handler.go', 'package api\n');
  write(dir, 'svc-b/go.mod', 'module example.com/svc-b\n');
  write(dir, 'svc-b/worker.go', 'package main\n');

  const modules = detectStackModules(dir, config());
  const roots = modules.map((mod) => mod.root);
  assert.deepEqual(roots, ['svc-a/api', 'svc-b']);
});

test('goProfile returns nothing for repos without Go markers', () => {
  const dir = repo();
  write(dir, 'package.json', '{"name":"x"}\n');
  assert.deepEqual(detectStackModules(dir, config()), []);
});
