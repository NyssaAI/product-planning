import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadPatternRuntimeConfig } from '../../scripts/code-map/lib/patterns/runtime-config.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPatternRuntimeConfig resolves split code-map and module-map config', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-pattern-config-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'build/index'), { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    '{"name":"fixture"}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'build/code-map.json',
        outputDir: 'build/index',
        roots: ['app'],
        languages: ['JavaScript'],
        patterns: { catalogs: ['plan-product.patterns.json'] },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'build/index/module-map.json'),
    `${JSON.stringify({ codeMap: 'docs/code-map/code-map.json' })}\n`,
    'utf8'
  );

  const config = loadPatternRuntimeConfig(dir);

  assert.equal(config.projectName, 'Fixture');
  assert.equal(config.outputDir, 'build/index');
  assert.equal(config.codeMapPath, 'build/code-map.json');
  assert.equal(config.moduleMapPath, 'build/index/module-map.json');
  assert.deepEqual(config.roots, ['app']);
  assert.deepEqual(config.languages, ['JavaScript']);
  assert.deepEqual(config.catalogs, ['plan-product.patterns.json']);
  assert.match(config.warnings[0], /CODE_MAP_PATH_MISMATCH/);
});

test('loadPatternRuntimeConfig includes plan-product pattern library and expectations', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-pattern-config-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'docs/code-map'), { recursive: true });
  mkdirSync(path.join(dir, '.plan-product/patterns'), { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    '{"name":"fixture"}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, '.plan-product/config.json'),
    `${JSON.stringify(
      {
        version: 1,
        paths: {
          patternLibrary: '.plan-product/patterns/library.json',
          patternExpectations: '.plan-product/patterns/expectations.json',
          codeMap: 'docs/code-map',
        },
        structure: {
          features: {
            inventory: 'docs/features.md',
            root: 'docs/features',
            idPattern: 'F-Nxx',
            folderPattern: 'f-nxx',
            featureFile: 'feature.md',
            featurePathPattern: 'docs/features/f-nxx/feature.md',
            useCaseIdPattern: 'UC-nnn',
            useCaseFilePattern: 'uc-nnn-short-slug.md',
            useCasePathPattern: 'docs/features/f-nxx/uc-nnn-short-slug.md',
          },
          codeMap: { root: 'docs/code-map' },
          patterns: {
            root: '.plan-product/patterns',
            library: '.plan-product/patterns/library.json',
            expectations: '.plan-product/patterns/expectations.json',
          },
        },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, '.plan-product/patterns/library.json'),
    '{"families":[]}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, '.plan-product/patterns/expectations.json'),
    '{"expectations":[{"id":"workflow","moduleTags":["workflow"],"expectedPatterns":["command"]}]}\n',
    'utf8'
  );

  const config = loadPatternRuntimeConfig(dir);

  assert.deepEqual(config.catalogs, ['.plan-product/patterns/library.json']);
  assert.equal(config.patternLibraryPath, '.plan-product/patterns/library.json');
  assert.equal(config.patternExpectationsPath, '.plan-product/patterns/expectations.json');
  assert.equal(config.expectations.length, 1);
});
