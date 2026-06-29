import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCodeIndexerModel } from '../../scripts/module-map/lib/build.mjs';

function config(manual) {
  return {
    projectName: 'fixture',
    outputDir: 'docs/code-index',
    codeMapOutput: 'docs/code-index/code-map.json',
    docs: { product: [], roadmap: [], techStack: [] },
    briefMaxCharsPerDoc: 1200,
    modules: {
      discover: 'manual',
      manual,
      pinned: [],
      globs: [],
      flows: {},
      minFiles: 1,
      maxFiles: 4,
    },
    nav: null,
    apiRoutes: { enabled: false, root: '', routeFile: 'route.ts', pathPrefix: '' },
    conventions: [],
    configFilePresent: false,
  };
}

test('module symbolCount is disjoint — a parent excludes child-module symbols', () => {
  const repoRoot = mkdtempSync(path.join(tmpdir(), 'mod-own-'));
  try {
    const codeMap = {
      files: [
        { path: 'scripts/module-map/build.mjs', symbols: [{ name: 'foo', kind: 'function', line: 1 }] },
        { path: 'scripts/version.mjs', symbols: [{ name: 'bar', kind: 'function', line: 1 }] },
      ],
      endpoints: [],
    };
    const model = buildCodeIndexerModel(
      repoRoot,
      config([
        { id: 'scripts', root: 'scripts' },
        { id: 'modmap', root: 'scripts/module-map' },
      ]),
      codeMap
    );

    const byId = Object.fromEntries(model.modules.map((m) => [m.id, m]));
    // Child owns its file.
    assert.equal(byId.modmap.symbolCount, 1);
    // Parent owns only the file no child claims — NOT the child's file too.
    assert.equal(byId.scripts.symbolCount, 1);
    // Public surface is likewise disjoint: parent's surface excludes build.mjs.
    const parentFiles = new Set((byId.scripts.publicSurface ?? []).map((s) => s.file));
    assert.equal(parentFiles.has('scripts/module-map/build.mjs'), false);
    assert.equal(parentFiles.has('scripts/version.mjs'), true);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
