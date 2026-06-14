import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotateCodeMapWithModules } from '../../scripts/code-map/lib/module-linker.mjs';

test('annotateCodeMapWithModules links files and symbols to their ai-plan modules', () => {
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
    outputDir: 'docs/agent-plan/context',
  });

  const ordersFile = annotated.files.find(
    (file) => file.path === 'src/orders/service.ts'
  );
  assert.equal(ordersFile.moduleId, 'orders');
  assert.equal(ordersFile.moduleName, 'Orders');
  assert.equal(ordersFile.moduleRoot, 'src/orders');
  assert.equal(
    ordersFile.planningModule,
    'docs/agent-plan/context/modules/orders.md'
  );
  assert.equal(ordersFile.symbols[0].moduleId, 'orders');

  assert.deepEqual(annotated.modules, [
    {
      id: 'orders',
      name: 'Orders',
      root: 'src/orders',
      planningModule: 'docs/agent-plan/context/modules/orders.md',
      fileCount: 1,
      symbolCount: 1,
      endpointCount: 1,
    },
    {
      id: 'users',
      name: 'Users',
      root: 'src/users',
      planningModule: 'docs/agent-plan/context/modules/users.md',
      fileCount: 1,
      symbolCount: 1,
      endpointCount: 0,
    },
  ]);

  const createOrder = annotated.symbols.find(
    (symbol) =>
      symbol.file === 'src/orders/service.ts' &&
      symbol.name === 'createOrder'
  );
  assert.equal(createOrder.moduleId, 'orders');
  assert.equal(
    createOrder.planningModule,
    'docs/agent-plan/context/modules/orders.md'
  );

  assert.equal(annotated.endpoints[0].moduleId, 'orders');
  assert.equal(
    annotated.endpoints[0].planningModule,
    'docs/agent-plan/context/modules/orders.md'
  );
});

test('annotateCodeMapWithModules honors a legacy/project-configured output dir', () => {
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

  // Legacy projects point ai-plan output at docs/ai-plan instead of the
  // current docs/agent-plan/context tree (problem evidence: docs/ai-plan/CODE_MAP.json).
  const annotated = annotateCodeMapWithModules(codeMap, modules, {
    outputDir: 'docs/ai-plan',
  });

  assert.equal(
    annotated.modules[0].planningModule,
    'docs/ai-plan/modules/orders.md'
  );
  const file = annotated.files[0];
  assert.equal(file.moduleId, 'orders');
  assert.equal(file.planningModule, 'docs/ai-plan/modules/orders.md');
  assert.equal(file.symbols[0].planningModule, 'docs/ai-plan/modules/orders.md');
  assert.equal(
    annotated.endpoints[0].planningModule,
    'docs/ai-plan/modules/orders.md'
  );
  // Flat symbol index is present and carries module metadata for search.
  assert.equal(annotated.symbols[0].moduleId, 'orders');
  assert.equal(annotated.symbols[0].file, 'app/api/orders/route.ts');
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
    outputDir: 'docs/agent-plan/context',
  });

  const file = annotated.files[0];
  assert.equal(file.moduleId, undefined);
  // Still appears in the flat symbol index so agents can search it.
  assert.equal(annotated.symbols.length, 1);
  assert.equal(annotated.symbols[0].name, 'run');
  assert.equal(annotated.symbols[0].moduleId, undefined);
  // Module summary counts reflect zero owned files.
  assert.equal(annotated.modules[0].fileCount, 0);
});
