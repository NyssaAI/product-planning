import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyNodeOrganization } from '../../scripts/module-map/lib/node-organization.mjs';

test('classifyNodeOrganization groups modules by Node/TypeScript role', () => {
  const modules = [
    { id: 'web', name: 'Web', root: 'src/app' },
    {
      id: 'orders-api',
      name: 'Orders API',
      root: 'src/orders',
      httpRoutes: [{ path: '/orders', methods: ['POST'], file: 'src/orders/route.ts' }],
    },
    { id: 'auth', name: 'Auth', root: 'packages/auth', source: 'workspace' },
    { id: 'core', name: 'Core', root: 'src/lib' },
    { id: 'store', name: 'Store', root: 'src/store' },
    { id: 'native', name: 'Native', root: 'native' },
    { id: 'misc', name: 'Misc', root: 'src/misc' },
  ];

  const groups = classifyNodeOrganization(modules);

  // Canonical display order, empty categories omitted (all present here).
  assert.deepEqual(
    groups.map((g) => g.id),
    [
      'app-routes',
      'api-routes',
      'feature-packages',
      'shared-libraries',
      'state-stores',
      'native-platform',
      'other',
    ]
  );

  const byId = Object.fromEntries(
    groups.map((g) => [g.id, g.modules.map((m) => m.id)])
  );
  assert.deepEqual(byId['app-routes'], ['web']);
  assert.deepEqual(byId['api-routes'], ['orders-api']);
  assert.deepEqual(byId['feature-packages'], ['auth']);
  assert.deepEqual(byId['shared-libraries'], ['core']);
  assert.deepEqual(byId['state-stores'], ['store']);
  assert.deepEqual(byId['native-platform'], ['native']);
  assert.deepEqual(byId['other'], ['misc']);

  // Every module is classified exactly once.
  const total = groups.reduce((n, g) => n + g.modules.length, 0);
  assert.equal(total, modules.length);

  // Each group carries a human-readable title.
  const apiGroup = groups.find((g) => g.id === 'api-routes');
  assert.equal(apiGroup.title, 'API routes');
});

test('classifyNodeOrganization omits empty categories and prefers API role for routed modules', () => {
  const modules = [
    // Lives under packages/ (would be a feature package) but serves HTTP routes,
    // so the API role wins.
    {
      id: 'gateway',
      name: 'Gateway',
      root: 'packages/gateway',
      source: 'workspace',
      httpRoutes: [{ path: '/health', methods: ['GET'], file: 'packages/gateway/route.ts' }],
    },
    { id: 'ui', name: 'UI', root: 'src/pages' },
  ];

  const groups = classifyNodeOrganization(modules);
  assert.deepEqual(
    groups.map((g) => g.id),
    ['app-routes', 'api-routes']
  );
  const byId = Object.fromEntries(
    groups.map((g) => [g.id, g.modules.map((m) => m.id)])
  );
  assert.deepEqual(byId['api-routes'], ['gateway']);
  assert.deepEqual(byId['app-routes'], ['ui']);
});
