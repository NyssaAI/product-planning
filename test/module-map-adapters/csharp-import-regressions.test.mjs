import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import csharpAdapter from '../../scripts/module-map/lib/adapters/csharp.mjs';

function write(root, relative, content) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

function edges(graph) {
  return new Set(graph.edges.map((edge) => `${edge.from}->${edge.to}`));
}

test('C# masking keeps references after URL strings and comments visible', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'csharp-mask-'));
  try {
    write(root, 'App/App.csproj', '<Project Sdk="Microsoft.NET.Sdk" />');
    write(root, 'App/Target.cs', 'namespace App; public class Target {}');
    write(
      root,
      'App/Consumer.cs',
      [
        'namespace App;',
        'public class Consumer {',
        '  private string Regular = "https://example.test";',
        '  private string Verbatim = @"https://example.test/""quoted""";',
        '  private string Interpolated = $"https://example.test/{1}";',
        '  // "a quote and https://comment.test"',
        '  private Target Value = new Target();',
        '}',
      ].join('\n')
    );

    const graph = csharpAdapter.extract(root, [
      'App/Consumer.cs',
      'App/Target.cs',
    ]);
    assert.equal(edges(graph).has('App/Consumer.cs->App/Target.cs'), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('C# ProjectReference visibility follows the transitive closure', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'csharp-transitive-'));
  try {
    write(
      root,
      'Leaf/Leaf.csproj',
      '<Project Sdk="Microsoft.NET.Sdk" />'
    );
    write(
      root,
      'Middle/Middle.csproj',
      '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><ProjectReference Include="../Leaf/Leaf.csproj" /></ItemGroup></Project>'
    );
    write(
      root,
      'App/App.csproj',
      '<Project Sdk="Microsoft.NET.Sdk"><ItemGroup><ProjectReference Include="../Middle/Middle.csproj" /></ItemGroup></Project>'
    );
    write(root, 'Leaf/LeafType.cs', 'namespace Leaf; public class LeafType {}');
    write(root, 'Middle/MiddleType.cs', 'namespace Middle; public class MiddleType {}');
    write(
      root,
      'App/Consumer.cs',
      'using Leaf; namespace App; public class Consumer { private LeafType Value = new LeafType(); }'
    );

    const graph = csharpAdapter.extract(root, [
      'App/Consumer.cs',
      'Middle/MiddleType.cs',
      'Leaf/LeafType.cs',
    ]);
    assert.equal(edges(graph).has('App/Consumer.cs->Leaf/LeafType.cs'), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
