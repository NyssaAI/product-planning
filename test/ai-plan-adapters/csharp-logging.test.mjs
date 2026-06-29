import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const fixtureRoot = path.join(__dirname, 'fixtures', 'csharp-repo');

test('csharp adapter does not log normal extraction at info level', () => {
  const script = `
    import csharpAdapter from ${JSON.stringify(pathToFileURL(path.join(repoRoot, 'scripts/module-map/lib/adapters/csharp.mjs')).href)};
    csharpAdapter.extract(${JSON.stringify(fixtureRoot)}, [
      'App/Orders/Order.cs',
      'App/Orders/OrderService.cs'
    ]);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module'], {
    input: script,
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      LOG_LEVEL: '',
      DEBUG_AI_PLAN: '',
    },
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});
