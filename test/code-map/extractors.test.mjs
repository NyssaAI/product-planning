import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractSignature } from '../../scripts/code-map/lib/signature-extractor.mjs';
import { extractDocComment } from '../../scripts/code-map/lib/comment-extractor.mjs';
import { extractFileHeaderComment } from '../../scripts/code-map/lib/file-header-comment.mjs';
import {
  createSourceFileCache,
  splitSourceLines,
} from '../../scripts/code-map/lib/source-lines.mjs';

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

test('extractFileHeaderComment reads CRLF line-doc header variants', () => {
  for (const prefix of ['//', '///', '//!']) {
    assert.equal(
      extractFileHeaderComment(
        `${prefix} First header line.\r\n${prefix} Second header line.\r\nexport const value = 1;\r\n`
      ),
      'First header line.\nSecond header line.'
    );
  }
});

test('extractors accept pre-split lines without changing results', () => {
  const content =
    '/**\n * Builds a user.\n */\nexport function buildUser(id: string) {\n}\n';
  const file = fixture('pre-split.ts', content);
  const lines = splitSourceLines(content);

  assert.equal(extractSignature(lines, 4), extractSignature(file, 4));
  assert.equal(extractDocComment(lines, 4), extractDocComment(file, 4));
});

test('source cache reads and splits each file once per build', () => {
  let reads = 0;
  const readSource = createSourceFileCache(() => {
    reads += 1;
    return 'export function cached() {}\n';
  });

  const first = readSource('cached.ts');
  const second = readSource('cached.ts');
  assert.equal(reads, 1);
  assert.equal(second, first);
  assert.equal(extractSignature(first.lines, 1), 'export function cached()');
});

test('extractDocComment removes C# XML tags and preserves referenced names', () => {
  const lines = splitSourceLines(
    '/// <summary>Loads <see cref="Order"/> for <paramref name="id"/>.</summary>\npublic Order Load(string id) { }\n'
  );
  assert.equal(extractDocComment(lines, 2), 'Loads Order for id.');
});

test('extractSignature skips multi-line decorated Python declarations', () => {
  const lines = splitSourceLines(
    '@app.route(\n    "/orders",\n    methods=["GET"],\n)\ndef list_orders():\n    pass\n'
  );
  assert.equal(extractSignature(lines, 1), 'def list_orders()');
});
