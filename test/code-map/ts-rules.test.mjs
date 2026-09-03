import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../scripts/lib/resolve-ast-grep.mjs';
import {
  parseScanJson,
  symbolNameFromMatch,
} from '../../scripts/lib/sg-result.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../scripts/code-map');
const SG_CONFIG = path.join(CODE_MAP_DIR, 'sgconfig.yml');

// Every shape the old pattern-based rules missed: extends, implements,
// generics, abstract, generators, typed async, const enum, ambient
// declarations, and a TypeScript default export.
const TS_SAMPLE = `export class Plain {}
export class Svc implements OnModuleInit {}
export class Comp extends React.Component<Props> {}
export abstract class Base<T> {}
@Injectable()
export class Decorated {}
export function plain(a: string) { return a; }
export function typed(a: string): string { return a; }
export function gen<T>(x: T): T { return x; }
export async function af(): Promise<void> {}
export function* generator() {}
export const c1 = 1;
export const [d1, d2] = [1, 2];
export let l1 = 2;
export interface I1 {}
export interface I2 extends I1 {}
export type T1 = string;
export type T2<U> = U;
export enum E1 { A }
export const enum E2 { B }
export default async function main() {}
export declare function decl(): void;
class NotExported {}
function notExported() {}
`;

const JS_SAMPLE = `export class Page {}
export class Comp extends React.Component {}
export function handler(req) {}
export async function load() {}
export const cfg = {};
export default function Home() {}
`;

/** @param {import('node:test').TestContext} t */
function scan(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ts-rules-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, 'sample.ts'), TS_SAMPLE, 'utf8');
  writeFileSync(path.join(dir, 'sample.js'), JS_SAMPLE, 'utf8');
  const binary = resolveAstGrepBinary({
    toolkitDir: CODE_MAP_DIR,
    projectRoot: path.resolve(__dirname, '../..'),
  });
  const result = spawnSync(
    binary,
    ['scan', dir, '--config', SG_CONFIG, '--json', '--include-metadata'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  assert.equal(result.error, undefined);
  /** @type {Map<string, string[]>} name -> kinds, per file extension */
  const byFile = new Map([['ts', new Map()], ['js', new Map()]]);
  for (const match of parseScanJson(result.stdout ?? '')) {
    const ext = String(match.file).endsWith('.ts') ? 'ts' : 'js';
    const name = symbolNameFromMatch(match);
    const kind = /** @type {{ mapKind?: string }} */ (match.metadata ?? {}).mapKind;
    const kinds = byFile.get(ext);
    kinds.set(name, [...(kinds.get(name) ?? []), kind]);
  }
  return byFile;
}

test('TypeScript rules index every exported declaration shape with the right kind', (t) => {
  const ts = scan(t).get('ts');
  const expected = {
    Plain: 'class',
    Svc: 'class',
    Comp: 'class',
    Base: 'class',
    Decorated: 'class',
    plain: 'function',
    typed: 'function',
    gen: 'function',
    af: 'async-function',
    generator: 'function',
    c1: 'const',
    l1: 'const',
    I1: 'interface',
    I2: 'interface',
    T1: 'type',
    T2: 'type',
    E1: 'enum',
    E2: 'enum',
    main: 'default-function',
    decl: 'function',
  };
  for (const [name, kind] of Object.entries(expected)) {
    assert.deepEqual(ts.get(name), [kind], name);
  }
  assert.equal(ts.has('NotExported'), false);
  assert.equal(ts.has('notExported'), false);
  assert.equal(ts.has('[d1, d2]'), false, 'destructured exports yield no bogus symbol');
});

test('JavaScript rules index extends, async, const, and default exports', (t) => {
  const js = scan(t).get('js');
  assert.deepEqual(js.get('Page'), ['class']);
  assert.deepEqual(js.get('Comp'), ['class']);
  assert.deepEqual(js.get('handler'), ['function']);
  assert.deepEqual(js.get('load'), ['async-function']);
  assert.deepEqual(js.get('cfg'), ['const']);
  assert.deepEqual(js.get('Home'), ['default-function']);
});
