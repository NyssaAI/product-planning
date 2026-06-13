import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csharpAdapter from '../../scripts/ai-plan/lib/adapters/csharp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const fixtureRoot = path.join(__dirname, 'fixtures', 'csharp-repo');

const files = [
  'App/External/ExternalThing.cs',
  'App/GlobalUsings.cs',
  'App/Models/DuplicateModel.cs',
  'App/Orders/Order.cs',
  'App/Orders/OrderRepository.cs',
  'App/Orders/OrderService.cs',
  'App/Other/DuplicateModel.cs',
  'App/Shared/Result.cs',
  'Contracts/SharedContract.cs',
];

function edgeMap(graph) {
  return new Map(graph.edges.map((edge) => [`${edge.from}->${edge.to}`, edge]));
}

test('csharp adapter resolves namespaces, aliases, global usings, and project references', () => {
  const graph = csharpAdapter.extract(fixtureRoot, files);
  const edges = edgeMap(graph);

  assert.equal(
    edges.get('App/Orders/OrderService.cs->App/Models/DuplicateModel.cs')?.weight,
    1
  );
  assert.equal(
    edges.has('App/Orders/OrderService.cs->App/Other/DuplicateModel.cs'),
    false
  );
  assert.equal(
    edges.get('App/Orders/OrderService.cs->App/Orders/OrderRepository.cs')?.weight,
    1
  );
  assert.equal(
    edges.get('App/Orders/OrderService.cs->App/Shared/Result.cs')?.weight,
    1
  );
  assert.equal(
    edges.get('App/Orders/OrderService.cs->Contracts/SharedContract.cs')?.weight,
    2
  );
  assert.equal(
    edges.has('App/Orders/OrderService.cs->App/External/ExternalThing.cs'),
    false
  );
  assert.equal(
    graph.files.some((file) => file.path === 'App/External/ExternalThing.cs'),
    false
  );
});

test('csharp adapter exposes namespace-qualified symbols', () => {
  const graph = csharpAdapter.extract(fixtureRoot, files);
  const model = graph.files.find((file) => file.path === 'App/Models/DuplicateModel.cs');

  assert.deepEqual(model.symbols, [
    {
      name: 'MyApp.Models.DuplicateModel',
      kind: 'class',
      line: 1,
    },
  ]);
});

test('csharp adapter source has no NUL separators', () => {
  const source = readFileSync(
    path.join(repoRoot, 'scripts/ai-plan/lib/adapters/csharp.mjs'),
    'utf8'
  );

  assert.equal(source.includes('\u0000'), false);
});
