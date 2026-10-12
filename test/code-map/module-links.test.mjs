import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotateCodeMapWithModules } from '../../scripts/code-map/lib/module-linker.mjs';

test('annotateCodeMapWithModules links canonical files and endpoints to module metadata', () => {
  const codeMap = {
    files: [
      {
        path: 'src/orders/service.ts',
        symbols: [{ name: 'createOrder', kind: 'function', line: 1 }],
      },
      {
        path: 'src/users/service.ts',
        symbols: [{ name: 'createUser', kind: 'function', line: 1 }],
      },
    ],
    endpoints: [
      {
        kind: 'http',
        method: 'POST',
        path: '/orders',
        file: 'src/orders/service.ts',
        line: 3,
      },
    ],
  };
  const modules = [
    { id: 'orders', name: 'Orders', root: 'src/orders' },
    { id: 'users', name: 'Users', root: 'src/users' },
  ];

  const annotated = annotateCodeMapWithModules(codeMap, modules, {
    outputDir: 'docs/code-map',
  });

  const ordersFile = annotated.files.find(
    (file) => file.path === 'src/orders/service.ts'
  );
  assert.equal(ordersFile.moduleId, 'orders');
  assert.equal(ordersFile.symbols[0].moduleId, undefined);
  assert.equal(annotated.symbols, undefined);

  assert.deepEqual(annotated.modules, [
    {
      id: 'orders',
      name: 'Orders',
      root: 'src/orders',
      planningModule: 'docs/code-map/modules/orders.md',
      fileCount: 1,
      symbolCount: 1,
      endpointCount: 1,
    },
    {
      id: 'users',
      name: 'Users',
      root: 'src/users',
      planningModule: 'docs/code-map/modules/users.md',
      fileCount: 1,
      symbolCount: 1,
      endpointCount: 0,
    },
  ]);

  assert.equal(ordersFile.symbols[0].name, 'createOrder');
  assert.equal(annotated.endpoints[0].moduleId, 'orders');

});

test('annotateCodeMapWithModules honors a project-configured output dir', () => {
  const codeMap = {
    files: [
      {
        path: 'app/api/orders/route.ts',
        symbols: [{ name: 'POST', kind: 'route', line: 1 }],
      },
    ],
    endpoints: [
      {
        kind: 'http',
        method: 'POST',
        path: '/api/orders',
        file: 'app/api/orders/route.ts',
        line: 1,
      },
    ],
  };
  const modules = [{ id: 'orders', name: 'Orders', root: 'app/api/orders' }];

  // A project can point generated output at a custom dir instead of the
  // default docs/code-map tree; planningModule paths must follow it.
  const annotated = annotateCodeMapWithModules(codeMap, modules, {
    outputDir: 'build/index-out',
  });

  assert.equal(
    annotated.modules[0].planningModule,
    'build/index-out/modules/orders.md'
  );
  const file = annotated.files[0];
  assert.equal(file.moduleId, 'orders');
  assert.equal(annotated.endpoints[0].moduleId, 'orders');
  assert.equal(annotated.symbols, undefined);
});

test('annotateCodeMapWithModules leaves unowned files unlinked but indexed', () => {
  const codeMap = {
    files: [
      {
        path: 'scripts/tooling.ts',
        symbols: [{ name: 'run', kind: 'function', line: 1 }],
      },
    ],
    endpoints: [],
  };
  const modules = [{ id: 'orders', name: 'Orders', root: 'src/orders' }];

  const annotated = annotateCodeMapWithModules(codeMap, modules, {
    outputDir: 'docs/code-map',
  });

  const file = annotated.files[0];
  assert.equal(file.moduleId, undefined);
  assert.equal(file.symbols[0].name, 'run');
  assert.deepEqual(annotated.coverage.unownedFiles, ['scripts/tooling.ts']);
  // Module summary counts reflect zero owned files.
  assert.equal(annotated.modules[0].fileCount, 0);
});
