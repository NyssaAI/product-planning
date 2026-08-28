import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  astGrepPlatformPackage,
  resolveAstGrepBinary,
} from '../../scripts/lib/resolve-ast-grep.mjs';

const BINARY = process.platform === 'win32' ? 'ast-grep.exe' : 'ast-grep';

/** @returns {string} */
function makeRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'plan-product-astgrep-'));
  // findPluginRoot needs a plugin manifest to treat this as a plugin root.
  mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(
    path.join(root, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'plan-product', version: '0.0.0-test' })
  );
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ dependencies: { '@ast-grep/cli': '*' } })
  );
  return root;
}

/**
 * @param {string} root
 * @param {string} pkg npm package name, e.g. '@ast-grep/cli'
 */
function placeBinary(root, pkg) {
  const dir = path.join(root, 'node_modules', ...pkg.split('/'));
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, BINARY);
  writeFileSync(file, '');
  return file;
}

test('resolves the binary the postinstall copied into @ast-grep/cli', () => {
  const root = makeRoot();
  try {
    const expected = placeBinary(root, '@ast-grep/cli');
    assert.equal(resolveAstGrepBinary({ toolkitDir: root }), expected);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolves the platform package when the postinstall was blocked', (t) => {
  // The regression: npm's allowScripts / ignore-scripts policy blocks
  // @ast-grep/cli's postinstall, so the copy into @ast-grep/cli never happens.
  // The prebuilt is still installed as an optionalDependency and must be found.
  const platformPackage = astGrepPlatformPackage();
  if (!platformPackage) {
    t.skip(
      `no @ast-grep prebuilt is published for ${process.platform}/${process.arch}, ` +
        'so there is no platform package to resolve'
    );
    return;
  }

  const root = makeRoot();
  try {
    const expected = placeBinary(root, platformPackage);
    assert.equal(resolveAstGrepBinary({ toolkitDir: root }), expected);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('prefers the copied binary over the platform package', (t) => {
  const platformPackage = astGrepPlatformPackage();
  if (!platformPackage) {
    t.skip(`no @ast-grep prebuilt for ${process.platform}/${process.arch}`);
    return;
  }

  const root = makeRoot();
  try {
    const copied = placeBinary(root, '@ast-grep/cli');
    placeBinary(root, platformPackage);
    assert.equal(resolveAstGrepBinary({ toolkitDir: root }), copied);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('astGrepPlatformPackage names a package @ast-grep/cli can install', () => {
  const platformPackage = astGrepPlatformPackage();
  if (platformPackage === null) {
    // Legitimate on musl and unlisted architectures.
    return;
  }
  assert.match(platformPackage, /^@ast-grep\/cli-/);
});
