import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const skillsDir = path.join(root, 'skills');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function frontmatter(text, file) {
  const match = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    fail(`${file} is missing YAML frontmatter`);
  }
  return match[1];
}

function frontmatterField(markdown, field, file) {
  const match = markdown.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) {
    fail(`${file} frontmatter is missing ${field}`);
  }
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const processSummaryPatterns = [
  /\bCreates?\b/,
  /\bVerifies?\b/,
  /\bDocuments?\b/,
  /\bPerforms?\b/,
  /\bEstablishes?\b/,
  /\bWrites?\b/,
  /\bmerges?\b/i,
  /\bcleans up\b/i,
  /\bopens PR\b/i,
  /\bcommits?\b/i,
  /\bpushes?\b/i,
  /\broutes?\b/i,
  /\bgenerates? or consumes?\b/i,
  /\bSingle canonical\b/,
  /\bDefault plan executor\b/,
  /\bFallback inline plan executor\b/,
  /\bRalph loop fix\b/,
  /\bDo not invoke directly\b/,
  /\brequires running\b/i,
  /\brequires technical\b/i,
];

const skillDirs = readdirSync(skillsDir)
  .map((name) => path.join(skillsDir, name))
  .filter((entry) => statSync(entry).isDirectory())
  .sort();

let checked = 0;
for (const dir of skillDirs) {
  const file = path.join(dir, 'SKILL.md');
  if (!existsSync(file)) {
    continue;
  }

  const rel = path.relative(root, file).replace(/\\/g, '/');
  const yaml = frontmatter(readFileSync(file, 'utf8'), rel);
  const name = frontmatterField(yaml, 'name', rel);
  const description = frontmatterField(yaml, 'description', rel);
  const expectedName = path.basename(dir);

  assert.equal(name, expectedName, `${rel} name should match directory`);
  assert.match(name, /^[A-Za-z0-9-]+$/, `${rel} name should be skill-safe`);
  assert.equal(
    description.includes('MUST use this'),
    false,
    `${rel} description should not use directive shortcuts`
  );
  assert.equal(
    description.startsWith('Use when ') ||
      description.startsWith('Internal sub-skill '),
    true,
    `${rel} description should start with "Use when" or "Internal sub-skill"`
  );
  for (const pattern of processSummaryPatterns) {
    assert.equal(
      pattern.test(description),
      false,
      `${rel} description should describe trigger conditions, not workflow: ${pattern}`
    );
  }
  checked += 1;
}

console.log(`PASS: checked ${checked} skill metadata files`);
