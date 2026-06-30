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
  createMermaidNodeIds,
  loadArchitectureModel,
  normalizeArchitectureModel,
  preserveMarkedRegion,
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
    codeMap: 'docs/code-index/code-map.json',
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
        planningModule: 'docs/code-index/modules/api.md',
      },
      {
        id: 'lib',
        name: 'Lib',
        root: 'src/lib',
        description: 'Shared library.',
        capabilities: ['Shared helpers'],
        dependsOn: [],
        usedBy: ['api'],
        planningModule: 'docs/code-index/modules/lib.md',
      },
    ],
    edges: [{ from: 'api', to: 'lib' }],
    ...overrides,
  };
}

test('renderSystemArchitecture emits usage boundary, table, and Mermaid graph', () => {
  const out = renderSystemArchitecture(model());

  assert.match(out, /# Demo System Architecture/);
  assert.match(out, /## Use This When/);
  assert.match(out, /routine implementation planning/);
  assert.match(out, /```mermaid\nflowchart LR/);
  assert.match(out, /m_api\["API"\]/);
  assert.match(out, /m_api --> m_lib/);
  assert.match(out, /## Module Responsibilities/);
  assert.match(out, /\| API \| HTTP API layer\./);
  assert.match(out, /## Dependency Flows/);
  assert.match(out, /`api` -> `lib`/);
});

test('renderSystemArchitecture preserves the agent-authored overview region', () => {
  const existing = [
    '# Demo System Architecture',
    '',
    '<!-- code-index:system-overview:start -->',
    'This repo routes work through the API layer.',
    '<!-- code-index:system-overview:end -->',
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
      '<!-- code-index:system-overview:start -->',
      'Fallback overview.',
      '<!-- code-index:system-overview:end -->',
    ].join('\n')
  );
});

test('Mermaid node IDs stay distinct after sanitization collisions', () => {
  const ids = createMermaidNodeIds([
    { id: 'foo-bar' },
    { id: 'foo_bar' },
    { id: 'foo bar' },
  ]);

  assert.equal(ids.get('foo-bar'), 'm_foo_bar');
  assert.equal(ids.get('foo_bar'), 'm_foo_bar_2');
  assert.equal(ids.get('foo bar'), 'm_foo_bar_3');
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
          planningModule: 'docs/code-index/modules/solo.md',
        },
      ],
    })
  );

  assert.match(out, /m_solo\["Solo"\]/);
  assert.match(out, /No cross-module dependency edges/);
});

test('loadArchitectureModel reads the persisted module-map.json shape', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'code-indexer-arch-test-'));
  tempDirs.push(root);
  mkdirSync(path.join(root, 'docs/code-index'), { recursive: true });
  writeFileSync(
    path.join(root, 'docs/code-index/module-map.json'),
    `${JSON.stringify(model(), null, 2)}\n`,
    'utf8'
  );

  const loaded = loadArchitectureModel(root, { outputDir: 'docs/code-index' });

  assert.equal(loaded.modules.length, 2);
  assert.deepEqual(loaded.edges, [{ from: 'api', to: 'lib' }]);
});

test('normalizeArchitectureModel defaults edges to [] when field is absent', () => {
  const model = normalizeArchitectureModel({ modules: [] });
  assert.deepEqual(model.edges, []);
});
