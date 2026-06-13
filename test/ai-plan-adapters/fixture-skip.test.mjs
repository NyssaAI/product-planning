import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csharpAdapter from '../../scripts/ai-plan/lib/adapters/csharp.mjs';
import { selectAdapter } from '../../scripts/ai-plan/lib/adapters/index.mjs';
import { listRepoFiles } from '../../scripts/ai-plan/lib/repo-files.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// A JS repo whose ONLY C#/.csproj signal lives inside a `fixtures/` tree.
const repoRoot = path.resolve(__dirname, 'fixtures', 'js-with-fixtures-repo');

test('C# signal inside a fixtures/ tree does not match the C# adapter', () => {
  // Before the fix, hasDotnetSignal() descended into fixtures/ and matched on
  // the sample .csproj, mis-selecting the C# adapter for a JS project.
  assert.equal(csharpAdapter.matches(repoRoot), false);
  assert.notEqual(selectAdapter(repoRoot)?.id, 'csharp');
});

test('repo file walk skips fixtures/ so fixture sources are not detected as modules', () => {
  const files = listRepoFiles(repoRoot);
  assert.ok(
    files.includes('src/index.mjs'),
    'real source under src/ should be walked'
  );
  assert.equal(
    files.some((f) => f.startsWith('fixtures/')),
    false,
    'no files under fixtures/ should appear in the walk'
  );
});
