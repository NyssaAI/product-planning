import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractSignature } from '../../scripts/code-map/lib/signature-extractor.mjs';
import { extractDocComment } from '../../scripts/code-map/lib/comment-extractor.mjs';

/** @type {string[]} */
const tempDirs = [];

/**
 * @param {string} name
 * @param {string} content
 * @returns {string} absolute path
 */
function fixture(name, content) {
  const dir = mkdtempSync(path.join(tmpdir(), 'code-map-test-'));
  tempDirs.push(dir);
  const file = path.join(dir, name);
  writeFileSync(file, content, 'utf8');
  return file;
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('extractSignature: single-line TypeScript function', () => {
  const file = fixture(
    'a.ts',
    `export async function authenticate(userId: string, password: string): Promise<AuthResult> {\n  return null;\n}\n`
  );
  assert.equal(
    extractSignature(file, 1),
    'export async function authenticate(userId: string, password: string): Promise<AuthResult>'
  );
});

test('extractSignature: multi-line parameter list', () => {
  const file = fixture(
    'b.cs',
    `public Task<IActionResult> GetUser(\n    int id,\n    bool includeProfile)\n{\n}\n`
  );
  assert.equal(
    extractSignature(file, 1),
    'public Task<IActionResult> GetUser( int id, bool includeProfile)'
  );
});

test('extractSignature: Python def strips trailing colon', () => {
  const file = fixture('c.py', `def handler(req, res):\n    pass\n`);
  assert.equal(extractSignature(file, 1), 'def handler(req, res)');
});

test('extractSignature: class declaration without parens', () => {
  const file = fixture('d.ts', `export class UserService {\n}\n`);
  assert.equal(extractSignature(file, 1), 'export class UserService');
});

test('extractSignature: returns undefined past 8 lines without closing paren', () => {
  const file = fixture(
    'e.ts',
    `function f(\n a,\n b,\n c,\n d,\n e,\n f2,\n g,\n h,\n i) {}\n`
  );
  assert.equal(extractSignature(file, 1), undefined);
});

test('extractSignature: out-of-range line returns undefined', () => {
  const file = fixture('f.ts', `const x = 1;\n`);
  assert.equal(extractSignature(file, 99), undefined);
});

test('extractDocComment: // comment first sentence', () => {
  const file = fixture(
    'g.ts',
    `// Validates credentials and returns a signed JWT on success. Retries twice.\nexport function authenticate() {}\n`
  );
  assert.equal(
    extractDocComment(file, 2),
    'Validates credentials and returns a signed JWT on success.'
  );
});

test('extractDocComment: JSDoc block comment', () => {
  const file = fixture(
    'h.ts',
    `/**\n * Builds the user profile view.\n * @param id user id\n */\nexport function build(id) {}\n`
  );
  assert.equal(extractDocComment(file, 5), 'Builds the user profile view.');
});

test('extractDocComment: Python # comment', () => {
  const file = fixture(
    'i.py',
    `# Parses the config file.\ndef parse():\n    pass\n`
  );
  assert.equal(extractDocComment(file, 2), 'Parses the config file.');
});

test('extractDocComment: skips decorator lines between comment and symbol', () => {
  const file = fixture(
    'j.ts',
    `// Handles user routes.\n@Controller('users')\nexport class UserController {}\n`
  );
  assert.equal(extractDocComment(file, 3), 'Handles user routes.');
});

test('extractDocComment: no comment returns undefined', () => {
  const file = fixture('k.ts', `const a = 1;\nexport function f() {}\n`);
  assert.equal(extractDocComment(file, 2), undefined);
});

test('extractDocComment: truncates to 120 chars', () => {
  const long = 'A'.repeat(200);
  const file = fixture('l.ts', `// ${long}\nexport function f() {}\n`);
  const result = extractDocComment(file, 2);
  assert.ok(result.length <= 120);
});
