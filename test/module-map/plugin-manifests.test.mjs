import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('plugin manifests share package identity and version', () => {
  const pkg = readJson('package.json');
  const codex = readJson('.codex-plugin/plugin.json');
  const claude = readJson('.claude-plugin/plugin.json');
  const cursor = readJson('.cursor-plugin/plugin.json');
  const gemini = readJson('gemini-extension.json');

  for (const manifest of [codex, claude, cursor, gemini]) {
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.version, pkg.version);
  }

  assert.equal(codex.interface.displayName, 'plan-product');
  assert.equal(codex.skills, './skills/');
  assert.equal(codex.commands, undefined);

  assert.equal(cursor.displayName, 'plan-product');
  assert.equal(cursor.skills, './skills/');
  assert.equal(cursor.commands, './commands/');

  assert.equal(gemini.contextFileName, 'GEMINI.md');
});

test('plugin manifests point at the current repository and package excludes local usage ledger', () => {
  const codex = readJson('.codex-plugin/plugin.json');
  const claude = readJson('.claude-plugin/plugin.json');
  const cursor = readJson('.cursor-plugin/plugin.json');
  const install = readFileSync('.codex/INSTALL.md', 'utf8');

  assert.equal(codex.repository, 'https://github.com/jamaynor/code-indexer');
  assert.equal(codex.homepage, 'https://github.com/jamaynor/code-indexer');
  assert.equal(codex.interface.websiteURL, 'https://github.com/jamaynor/code-indexer');
  assert.equal(claude.repository, 'https://github.com/jamaynor/code-indexer');
  assert.equal(cursor.repository, 'https://github.com/jamaynor/code-indexer');
  assert.equal(cursor.homepage, 'https://github.com/jamaynor/code-indexer');
  assert.match(
    install,
    /raw\.githubusercontent\.com\/jamaynor\/code-indexer\/refs\/heads\/main\/README\.md/
  );

  const pack =
    process.env.npm_execpath
      ? spawnSync(
          process.execPath,
          [process.env.npm_execpath, 'pack', '--dry-run', '--json'],
          { encoding: 'utf8' }
        )
      : process.platform === 'win32'
        ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm pack --dry-run --json'], {
            encoding: 'utf8',
          })
        : spawnSync('npm', ['pack', '--dry-run', '--json'], {
            encoding: 'utf8',
          });
  assert.equal(pack.status, 0, pack.stderr);
  const [payload] = JSON.parse(pack.stdout);
  const paths = new Set(payload.files.map((file) => file.path));
  assert.equal(paths.has('.plan-product/usage/events.jsonl'), false);
  assert.equal(paths.has('.plan-product/config.json'), true);
  assert.equal(paths.has('.plan-product/templates/product.md'), true);
  assert.equal(paths.has('.plan-product/patterns/library.json'), true);
});
