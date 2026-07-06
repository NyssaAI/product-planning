import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadArchitectureModel,
  normalizeArchitectureModel,
  preserveMarkedRegion,
  renderArchitectureTree,
  renderSystemArchitecture,
} from '../../scripts/module-map/lib/architecture.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function model(overrides = {}) {
  return {
    schemaVersion: '1.0',
    generated: '2026-06-30T00:00:00.000Z',
    project: { name: 'Demo' },
    codeMap: 'docs/code-map/code-map.json',
    stats: { moduleCount: 2 },
    modules: [
      {
        id: 'api',
        name: 'API',
        root: 'src/api',
        description: 'HTTP API layer.',
        capabilities: ['API handlers'],
        dependsOn: ['lib'],
        usedBy: [],
        planningModule: 'docs/code-map/modules/api.md',
      },
      {
        id: 'lib',
        name: 'Lib',
        root: 'src/lib',
        description: 'Shared library.',
        capabilities: ['Shared helpers'],
        dependsOn: [],
        usedBy: ['api'],
        planningModule: 'docs/code-map/modules/lib.md',
      },
    ],
    edges: [{ from: 'api', to: 'lib' }],
    ...overrides,
  };
}

test('renderSystemArchitecture emits usage boundary, table, and component tree', () => {
  const out = renderSystemArchitecture(model());

  assert.match(out, /# Demo System Architecture/);
  assert.match(out, /## Use This When/);
  assert.match(out, /routine implementation planning/);
  assert.match(out, /## Component Tree/);
  assert.match(out, /```text\nDemo/);
  assert.match(out, /\|-- Lib \(lib\)/);
  assert.match(out, /\|   \|-- root: src\/lib/);
  assert.match(out, /\|   \|-- depends on: -/);
  assert.match(out, /\|   `-- used by: api/);
  assert.match(out, /`-- API \(api\)/);
  assert.match(out, /    \|-- depends on: lib/);
  assert.match(out, /## Module Responsibilities/);
  assert.match(out, /\| API \| HTTP API layer\./);
  assert.match(out, /## Dependency Flows/);
  assert.match(out, /`api` -> `lib`/);
  assert.doesNotMatch(out, /```mermaid/);
});

test('renderSystemArchitecture lists modules by ascending direct dependency count', () => {
  const out = renderSystemArchitecture(
    model({
      modules: [
        {
          id: 'feature-b',
          name: 'Feature B',
          root: 'src/feature-b',
          description: 'Depends on two modules.',
          capabilities: [],
          dependsOn: ['core', 'shared'],
          usedBy: [],
          planningModule: 'docs/code-map/modules/feature-b.md',
        },
        {
          id: 'core',
          name: 'Core',
          root: 'src/core',
          description: 'Foundation.',
          capabilities: [],
          dependsOn: [],
          usedBy: ['feature-a', 'feature-b'],
          planningModule: 'docs/code-map/modules/core.md',
        },
        {
          id: 'feature-a',
          name: 'Feature A',
          root: 'src/feature-a',
          description: 'Depends on one module.',
          capabilities: [],
          dependsOn: ['core'],
          usedBy: [],
          planningModule: 'docs/code-map/modules/feature-a.md',
        },
        {
          id: 'shared',
          name: 'Shared',
          root: 'src/shared',
          description: 'Also foundational.',
          capabilities: [],
          dependsOn: [],
          usedBy: ['feature-b'],
          planningModule: 'docs/code-map/modules/shared.md',
        },
      ],
      edges: [
        { from: 'feature-b', to: 'core' },
        { from: 'feature-b', to: 'shared' },
        { from: 'feature-a', to: 'core' },
      ],
    })
  );

  assert.ok(
    out.indexOf('|-- Core (core)') < out.indexOf('|-- Shared (shared)'),
    'zero-dependency modules are tie-broken by id'
  );
  assert.ok(
    out.indexOf('|-- Shared (shared)') < out.indexOf('|-- Feature A (feature-a)'),
    'zero-dependency modules render before one-dependency modules'
  );
  assert.ok(
    out.indexOf('|-- Feature A (feature-a)') < out.indexOf('`-- Feature B (feature-b)'),
    'one-dependency modules render before two-dependency modules'
  );
  assert.ok(
    out.indexOf('| Core | Foundation.') < out.indexOf('| Shared | Also foundational.'),
    'module table follows the same tie-broken order'
  );
  assert.ok(
    out.indexOf('| Feature A | Depends on one module.') <
      out.indexOf('| Feature B | Depends on two modules.'),
    'module table follows ascending dependency count'
  );
});

test('renderSystemArchitecture preserves the agent-authored overview region', () => {
  const existing = [
    '# Demo System Architecture',
    '',
    '<!-- plan-product:system-overview:start -->',
    'This repo routes work through the API layer.',
    '<!-- plan-product:system-overview:end -->',
    '',
  ].join('\n');

  const out = renderSystemArchitecture(model(), { existingMarkdown: existing });

  assert.match(out, /This repo routes work through the API layer\./);
  assert.doesNotMatch(out, /Summarize the system architecture here/);
});

test('preserveMarkedRegion uses fallback when the region is absent', () => {
  assert.equal(
    preserveMarkedRegion('plain doc', 'system-overview', 'Fallback overview.'),
    [
      '<!-- plan-product:system-overview:start -->',
      'Fallback overview.',
      '<!-- plan-product:system-overview:end -->',
    ].join('\n')
  );
});

test('renderArchitectureTree includes module ids when names need disambiguation', () => {
  const out = renderArchitectureTree(
    model({
      project: { name: 'Names' },
      modules: [
        {
          id: 'foo-bar',
          name: 'Foo',
          root: 'src/foo-bar',
          description: 'Foo module.',
          capabilities: [],
          dependsOn: [],
          usedBy: ['foo_bar'],
          planningModule: 'docs/code-map/modules/foo-bar.md',
        },
        {
          id: 'foo_bar',
          name: 'Foo',
          root: 'src/foo_bar',
          description: 'Second foo module.',
          capabilities: [],
          dependsOn: ['foo-bar'],
          usedBy: [],
          planningModule: 'docs/code-map/modules/foo_bar.md',
        },
      ],
    })
  );

  assert.match(out, /\|-- Foo \(foo-bar\)/);
  assert.match(out, /`-- Foo \(foo_bar\)/);
  assert.match(out, /used by: foo_bar/);
  assert.match(out, /depends on: foo-bar/);
});

test('renderSystemArchitecture handles modules with no dependency edges', () => {
  const out = renderSystemArchitecture(
    model({
      edges: [],
      modules: [
        {
          id: 'solo',
          name: 'Solo',
          root: 'src/solo',
          description: 'Single module.',
          capabilities: [],
          dependsOn: [],
          usedBy: [],
          planningModule: 'docs/code-map/modules/solo.md',
        },
      ],
    })
  );

  assert.match(out, /`-- Solo \(solo\)/);
  assert.match(out, /depends on: -/);
  assert.match(out, /No cross-module dependency edges/);
});

test('loadArchitectureModel reads the persisted module-map.json shape', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'plan-product-arch-test-'));
  tempDirs.push(root);
  mkdirSync(path.join(root, 'docs/code-map'), { recursive: true });
  writeFileSync(
    path.join(root, 'docs/code-map/module-map.json'),
    `${JSON.stringify(model(), null, 2)}\n`,
    'utf8'
  );

  const loaded = loadArchitectureModel(root, { outputDir: 'docs/code-map' });

  assert.equal(loaded.modules.length, 2);
  assert.deepEqual(loaded.edges, [{ from: 'api', to: 'lib' }]);
});

test('normalizeArchitectureModel defaults edges to [] when field is absent', () => {
  const model = normalizeArchitectureModel({ modules: [] });
  assert.deepEqual(model.edges, []);
});
