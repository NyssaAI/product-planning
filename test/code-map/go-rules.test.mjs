import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../scripts/lib/resolve-ast-grep.mjs';
import {
  parseScanJson,
  symbolNameFromMatch,
} from '../../scripts/lib/sg-result.mjs';
import { isExcludedGoFile } from '../../scripts/code-map/lib/source-files.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../scripts/code-map');
const SG_CONFIG = path.join(CODE_MAP_DIR, 'sgconfig.yml');

const GO_SAMPLE = `package sample

type Server struct {
	addr string
}

type Store interface {
	Get(key string) string
}

func NewServer(addr string) *Server {
	return &Server{addr: addr}
}

func (s *Server) Handle(path string) string {
	return s.addr + path
}
`;

function scanGoSample() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'go-rules-'));
  writeFileSync(path.join(dir, 'sample.go'), GO_SAMPLE, 'utf8');
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
  return parseScanJson(result.stdout ?? '');
}

test('Go rules index func, method, struct, and interface with distinct kinds', () => {
  const matches = scanGoSample();
  const byName = new Map(
    matches.map((match) => [
      symbolNameFromMatch(match),
      /** @type {{ mapKind?: string }} */ (match.metadata ?? {}).mapKind,
    ])
  );

  assert.equal(byName.get('NewServer'), 'function');
  assert.equal(byName.get('Handle'), 'method');
  assert.equal(byName.get('Server'), 'struct');
  assert.equal(byName.get('Store'), 'interface');
});

test('method rule does not double-report plain functions', () => {
  const matches = scanGoSample();
  const kindsForNew = matches
    .filter((match) => symbolNameFromMatch(match) === 'NewServer')
    .map((match) => /** @type {{ mapKind?: string }} */ (match.metadata ?? {}).mapKind);
  assert.deepEqual(kindsForNew, ['function']);
});

test('excluded Go files are filtered from symbol and endpoint walks', () => {
  assert.equal(isExcludedGoFile('vendor/lib/handler.go'), true);
  assert.equal(isExcludedGoFile('internal/orders/testdata/sample.go'), true);
  assert.equal(isExcludedGoFile('internal/orders/service_test.go'), true);
  assert.equal(isExcludedGoFile('api/orders.pb.go'), true);
  assert.equal(isExcludedGoFile('internal/orders/service.go'), false);
  assert.equal(isExcludedGoFile('src/vendor.ts'), false);
  assert.equal(isExcludedGoFile('vendored/main.go'), false);
});
