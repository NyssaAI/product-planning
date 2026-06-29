import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderModuleScope } from '../../scripts/module-map/lib/render.mjs';

function mod(overrides = {}) {
  return {
    id: 'orders',
    name: 'Orders',
    root: 'src/orders',
    description: 'Orders module.',
    capabilities: [],
    doesNotOwn: [],
    publicSurface: [],
    symbolsSample: [],
    symbolCount: 5,
    dependsOn: [],
    usedBy: [],
    outOfScope: [],
    flows: [],
    entryPoints: [],
    testRoots: [],
    configFiles: [],
    httpRoutes: [],
    mcpTools: [],
    mcpResources: [],
    mcpPrompts: [],
    mcpTransports: [],
    nav: null,
    ...overrides,
  };
}

test('module doc states its code-map slice key (moduleId)', () => {
  const out = renderModuleScope({}, mod());
  assert.match(out, /moduleId: orders/);
  assert.match(out, /code-map\.json/);
});

test('module doc flags a module with no code-map coverage', () => {
  const out = renderModuleScope(
    {},
    mod({ id: 'test', name: 'test', root: 'test', symbolCount: 0 })
  );
  assert.match(out, /No code-map coverage/i);
});

test('module doc does not show the no-coverage note when symbols exist', () => {
  const out = renderModuleScope({}, mod({ symbolCount: 12 }));
  assert.doesNotMatch(out, /No code-map coverage/i);
});
