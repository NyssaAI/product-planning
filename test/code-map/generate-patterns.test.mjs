import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve('.');
const script = path.join(repoRoot, 'scripts/code-map/generate-patterns.mjs');
/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempProject() {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-generate-patterns-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  mkdirSync(path.join(dir, 'docs/code-map'), { recursive: true });
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
        output: 'docs/code-map/code-map.json',
        outputDir: 'docs/code-map',
        codeMapOutput: 'docs/code-map/code-map.json',
        roots: ['src'],
        languages: ['JavaScript'],
        modules: {
          discover: 'manual',
          manual: [{ id: 'src', name: 'Source', root: 'src' }],
        },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'docs/code-map/code-map.json'),
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        generated: '2026-06-30T00:00:00.000Z',
        roots: ['src'],
        languages: ['JavaScript'],
        files: [
          {
            path: 'src/cli.mjs',
            moduleId: 'src',
            moduleName: 'Source',
            moduleRoot: 'src',
            planningModule: 'docs/code-map/modules/src.md',
          },
        ],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'docs/code-map/module-map.json'),
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        generated: '2026-06-30T00:00:00.000Z',
        project: { name: 'Fixture' },
        modules: [
          {
            id: 'src',
            name: 'Source',
            root: 'src',
            planningModule: 'docs/code-map/modules/src.md',
          },
        ],
        edges: [],
        codeMap: 'docs/code-map/code-map.json',
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  return dir;
}

function run(dir, args = ['--json']) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}

test('generate-patterns --json writes patterns artifacts', () => {
  const dir = tempProject();
  writeFileSync(
    path.join(dir, 'src/cli.mjs'),
    'const args = process.argv.slice(2);\n',
    'utf8'
  );

  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.wrote, [
    'docs/code-map/patterns.json',
    'docs/code-map/patterns.md',
  ]);
  assert.ok(payload.patterns >= 1);
  assert.ok(payload.matches >= 1);
  assert.equal(payload.sourceFiles, 1);
  assert.equal(payload.eligibleFiles, 1);
  assert.equal(payload.eligibleLines, 1);
  assert.equal(payload.patternLines, 1);
  assert.equal(payload.patternLinePercent, 100);
  assert.equal(payload.excludedFiles, 0);
  assert.equal(existsSync(path.join(dir, 'docs/code-map/patterns.json')), true);
  assert.match(
    readFileSync(path.join(dir, 'docs/code-map/patterns.md'), 'utf8'),
    /Node CLI argument parser/
  );
});

test('generate-patterns --json fails parseably when code-map is missing', () => {
  const dir = tempProject();
  rmSync(path.join(dir, 'docs/code-map/code-map.json'), { force: true });
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'const args = [];\n', 'utf8');

  const result = run(dir);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, false);
  assert.deepEqual(payload.wrote, []);
  assert.match(payload.errors[0], /MISSING_CODE_MAP/);
});

test('generate-patterns --json fails parseably when module-map is missing', () => {
  const dir = tempProject();
  rmSync(path.join(dir, 'docs/code-map/module-map.json'), { force: true });
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'const args = [];\n', 'utf8');

  const result = run(dir);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, false);
  assert.deepEqual(payload.wrote, []);
  assert.match(payload.errors[0], /MISSING_MODULE_MAP/);
});

test('generate-patterns --json fails parseably for invalid repo catalog', () => {
  const dir = tempProject();
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'const args = [];\n', 'utf8');
  writeFileSync(
    path.join(dir, 'bad.patterns.json'),
    '{"patterns":[{"id":"Bad"}]}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'docs/code-map/code-map.json',
        outputDir: 'docs/code-map',
        codeMapOutput: 'docs/code-map/code-map.json',
        roots: ['src'],
        languages: ['JavaScript'],
        patterns: { catalogs: ['bad.patterns.json'] },
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  const result = run(dir);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, false);
  assert.match(payload.errors[0], /INVALID_PATTERN_CATALOG/);
});

test('generate-patterns --json succeeds with zero matches', () => {
  const dir = tempProject();
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'const args = [];\n', 'utf8');

  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);
  assert.equal(payload.matches, 0);
  assert.equal(payload.coveragePercent, 0);
});

test('generate-patterns --json uses code-map roots as source of truth', () => {
  const dir = tempProject();
  mkdirSync(path.join(dir, 'test'), { recursive: true });
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'const args = [];\n', 'utf8');
  writeFileSync(
    path.join(dir, 'test/cli.test.mjs'),
    'const args = process.argv.slice(2);\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'docs/code-map/code-map.json',
        outputDir: 'docs/code-map',
        codeMapOutput: 'docs/code-map/code-map.json',
        roots: ['test'],
        languages: ['JavaScript'],
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.sourceFiles, 1);
  assert.equal(payload.eligibleLines, 1);
  assert.equal(payload.matches, 0);
});

test('generate-patterns --json loads repo-defined catalogs', () => {
  const dir = tempProject();
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'specialHandler();\n', 'utf8');
  writeFileSync(
    path.join(dir, 'project.patterns.json'),
    `${JSON.stringify(
      {
        patterns: [
          {
            id: 'project-special-handler',
            name: 'Project special handler',
            language: 'JavaScript',
            confidence: 'medium',
            description: 'Project-specific special handler function.',
            rule: { pattern: 'specialHandler($$$)' },
          },
        ],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'docs/code-map/code-map.json',
        outputDir: 'docs/code-map',
        codeMapOutput: 'docs/code-map/code-map.json',
        roots: ['src'],
        languages: ['JavaScript'],
        patterns: { catalogs: ['project.patterns.json'] },
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(
    readFileSync(path.join(dir, 'docs/code-map/patterns.json'), 'utf8')
  );
  const projectPattern = report.patterns.find(
    (pattern) => pattern.id === 'project-special-handler'
  );

  assert.equal(projectPattern.occurrenceCount, 1);
});

test('generate-patterns --json reports no pattern-eligible files', () => {
  const dir = tempProject();
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'docs/code-map/code-map.json',
        outputDir: 'docs/code-map',
        codeMapOutput: 'docs/code-map/code-map.json',
        roots: ['src'],
        languages: ['JavaScript'],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(path.join(dir, 'src/tool.rb'), 'puts "hi"\n', 'utf8');

  const result = run(dir);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, false);
  assert.equal(payload.sourceFiles, 1);
  assert.equal(payload.eligibleFiles, 0);
  assert.equal(payload.excludedFiles, 1);
  assert.match(payload.errors[0], /NO_PATTERN_ELIGIBLE_FILES/);
});

test('generate-patterns --json reports unsupported files outside denominator', () => {
  const dir = tempProject();
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'docs/code-map/code-map.json',
        outputDir: 'docs/code-map',
        codeMapOutput: 'docs/code-map/code-map.json',
        roots: ['src'],
        languages: ['JavaScript'],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(path.join(dir, 'src/cli.mjs'), 'const args = [];\n', 'utf8');
  writeFileSync(path.join(dir, 'src/tool.rb'), 'puts "hi"\n', 'utf8');

  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  const report = JSON.parse(
    readFileSync(path.join(dir, 'docs/code-map/patterns.json'), 'utf8')
  );

  assert.equal(payload.sourceFiles, 2);
  assert.equal(payload.eligibleFiles, 1);
  assert.equal(payload.excludedFiles, 1);
  assert.equal(report.source.excludedFiles[0].extension, '.rb');
});
