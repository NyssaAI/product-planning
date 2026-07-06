import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndex } from '../../scripts/module-map/lib/render.mjs';

function baseModel(modules) {
  return {
    project: { name: 'Demo', docs: {} },
    generated: '2026-06-14T00:00:00.000Z',
    progressiveDisclosure: { levels: [] },
    conventions: [],
    modules,
  };
}

const config = { outputDir: 'docs/code-map' };

test('renderIndex emits a Node/TypeScript code organization section grouped by role', () => {
  const model = baseModel([
    {
      id: 'orders-api',
      name: 'Orders API',
      root: 'src/orders',
      description: 'Order endpoints.',
      capabilities: [],
      httpRoutes: [{ path: '/orders', methods: ['POST'], file: 'src/orders/route.ts' }],
      entryPoints: [],
    },
    {
      id: 'core',
      name: 'Core',
      root: 'src/lib',
      description: 'Shared helpers.',
      capabilities: [],
      httpRoutes: [],
      entryPoints: ['src/lib/index.ts'],
    },
  ]);

  const out = renderIndex(model, config);

  assert.match(out, /## Code organization \(Node\/TypeScript\)/);
  // Role subheadings present for the roles that have modules.
  assert.match(out, /### API routes/);
  assert.match(out, /### Shared & core libraries/);
  // Concrete root path and module-doc link, plus the code-map slice (moduleId).
  assert.match(out, /`src\/orders\/`/);
  assert.match(out, /\.\/modules\/orders-api\.md/);
  assert.match(out, /moduleId.*orders-api|orders-api/);
  // Public entry points surfaced for planning.
  assert.match(out, /## (Public entry points|Code organization)/);
  assert.match(out, /src\/lib\/index\.ts/);
});

test('renderIndex omits the organization section when there are no modules', () => {
  const out = renderIndex(baseModel([]), config);
  assert.doesNotMatch(out, /## Code organization/);
});
