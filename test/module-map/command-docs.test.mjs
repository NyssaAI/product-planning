import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const docs = [
  'commands/ci.md',
  'commands/code-indexer.md',
  'skills/using-code-indexer/SKILL.md',
];

test('consumer-facing /ci arch docs use plugin-root script paths', () => {
  for (const file of docs) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /\$\{?PLUGIN_ROOT\}?|<PLUGIN_ROOT>/, file);
    assert.doesNotMatch(
      text,
      /node scripts\/module-map\/generate\.mjs --arch/,
      file
    );
  }
});

test('consumer-facing /ci patterns docs use plugin-root script paths', () => {
  for (const file of docs) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /generate-patterns\.mjs/, file);
    assert.doesNotMatch(
      text,
      /node scripts\/code-map\/generate-patterns\.mjs/,
      file
    );
  }
});
