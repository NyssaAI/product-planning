import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ownerRoot,
  ownsFile,
} from '../../scripts/module-map/lib/module-ownership.mjs';

const roots = ['scripts', 'scripts/module-map', 'scripts/code-map'];

test('ownerRoot picks the most-specific (longest) matching root', () => {
  assert.equal(ownerRoot('scripts/module-map/build.mjs', roots), 'scripts/module-map');
  assert.equal(ownerRoot('scripts/code-map/x.mjs', roots), 'scripts/code-map');
  // A file directly under the parent root, not in any child, belongs to the parent.
  assert.equal(ownerRoot('scripts/version-files.mjs', roots), 'scripts');
  // No matching root.
  assert.equal(ownerRoot('test/foo.test.mjs', roots), null);
});

test('ownsFile is disjoint — a parent does not own a child module file', () => {
  // The child owns its file...
  assert.equal(ownsFile('scripts/module-map', 'scripts/module-map/build.mjs', roots), true);
  // ...and the parent does NOT (most-specific wins).
  assert.equal(ownsFile('scripts', 'scripts/module-map/build.mjs', roots), false);
  // The parent owns only files not claimed by a child.
  assert.equal(ownsFile('scripts', 'scripts/version-files.mjs', roots), true);
});

test('ownerRoot treats "." / "" repo root as lowest precedence', () => {
  const withRepoRoot = ['.', 'scripts/module-map'];
  assert.equal(ownerRoot('scripts/module-map/x.mjs', withRepoRoot), 'scripts/module-map');
  assert.equal(ownerRoot('README.md', withRepoRoot), '.');
});
