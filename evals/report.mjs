// Responsibility: Generate, check, and gate the latest plugin evaluation evidence and Candidate SHA-256 report.
// Public interface:
// +-- candidateSha256(repoRoot)
// +-- render(repoRoot)
// +-- runReport(command, options)
// `-- sourceInventory(repoRoot)

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const INVENTORY_DIRS = [
  'skills',
  'src',
  'scripts',
  'commands',
  'harness-adapters',
  'docs',
  '.claude-plugin',
  '.codex-plugin',
  '.cursor-plugin',
  '.tessl-plugin',
  '.github',
  'test',
  'evals',
];

const INVENTORY_ROOT_FILES = [
  'plugin.json',
  'gemini-extension.json',
  'package.json',
  'package-lock.json',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  '.gitattributes',
  '.gitignore',
];

const EXCLUDED_SEGMENTS = new Set([
  '.temp',
  '.git',
  '__pycache__',
  'node_modules',
  'results',
  'attempts',
  'evidence',
  'reports',
  '.nyssa-ai',
  '.nyssaai',
  '.nyssa',
]);

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.py',
  '.json',
  '.yaml',
  '.yml',
  '.txt',
  '.toml',
  '.mjs',
  '.cjs',
  '.js',
  '.ts',
  '.sh',
  '.ps1',
]);

const TEXT_FILENAMES = new Set(['LICENSE', '.gitignore', '.gitattributes']);

function asciiCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function normalizeLineEndingsBytes(buf) {
  if (!buf.includes(0x0d)) return buf;
  const out = [];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0d) {
      if (buf[i + 1] === 0x0a) i++;
      out.push(0x0a);
    } else {
      out.push(buf[i]);
    }
  }
  return Buffer.from(out);
}

function isTextPath(filePath) {
  const base = path.basename(filePath);
  const ext = path.extname(base).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || TEXT_FILENAMES.has(base);
}

function matchesSha256(raw, expected) {
  if (!expected || typeof expected !== 'string') return false;
  if (sha256Hex(raw) === expected) return true;
  const lf = normalizeLineEndingsBytes(raw);
  if (sha256Hex(lf) === expected) return true;
  const crlf = Buffer.from(lf.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  return sha256Hex(crlf) === expected;
}

function walkFiles(dirPath, rootDir, collected) {
  const entries = readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => asciiCompare(a.name, b.name));
  for (const entry of entries) {
    if (EXCLUDED_SEGMENTS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const stat = lstatSync(fullPath);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      walkFiles(fullPath, rootDir, collected);
    } else if (stat.isFile()) {
      if (entry.name === 'LATEST.md') continue;
      const rel = path.relative(rootDir, fullPath).replaceAll('\\', '/');
      if (rel.split('/').some(part => EXCLUDED_SEGMENTS.has(part))) continue;
      collected.push([rel, fullPath]);
    }
  }
}

/**
 * Return sorted POSIX-path -> SHA-256 inventory of tracked/declared candidate inputs (excluding LATEST.md and runtime/evidence outputs).
 */
export function sourceInventory(repoRoot = DEFAULT_ROOT) {
  const root = path.resolve(repoRoot);
  const collected = [];

  for (const top of INVENTORY_DIRS) {
    const topDir = path.join(root, top);
    if (!existsSync(topDir)) continue;
    const stat = lstatSync(topDir);
    if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
    walkFiles(topDir, root, collected);
  }

  for (const name of INVENTORY_ROOT_FILES) {
    const fullPath = path.join(root, name);
    if (!existsSync(fullPath)) continue;
    const stat = lstatSync(fullPath);
    if (stat.isSymbolicLink() || !stat.isFile()) continue;
    collected.push([name, fullPath]);
  }

  collected.sort((a, b) => asciiCompare(a[0], b[0]));
  const inventory = {};
  for (const [rel, fullPath] of collected) {
    if (rel in inventory) continue;
    const raw = readFileSync(fullPath);
    const normalized = isTextPath(fullPath) ? normalizeLineEndingsBytes(raw) : raw;
    inventory[rel] = sha256Hex(normalized);
  }
  return inventory;
}

/**
 * Compute the deterministic Candidate SHA-256 digest over sourceInventory(repoRoot).
 */
export function candidateSha256(repoRoot = DEFAULT_ROOT) {
  const inv = sourceInventory(repoRoot);
  const sortedKeys = Object.keys(inv).sort(asciiCompare);
  const ordered = {};
  for (const k of sortedKeys) ordered[k] = inv[k];
  return sha256Hex(Buffer.from(JSON.stringify(ordered), 'utf8'));
}

function evidenceRoot(root) {
  const inEvals = path.join(root, 'evals/evidence');
  if (existsSync(inEvals)) return inEvals;
  return path.join(root, '.temp/evals/evidence');
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function rowKeyTuple(row) {
  return [row.suite, row.harness, row.platform, row.config];
}

function rowKeyId(tuple) {
  return tuple.join('\0');
}

function suiteSha256(root, suite) {
  if (suite !== 'product-planning') {
    throw new Error(`Unknown suite: ${suite}`);
  }
  const evalsDir = path.join(root, 'evals');
  const wazaTasksDir = path.join(evalsDir, 'waza/skills/plan-product/tasks');
  const wazaTaskFiles = existsSync(wazaTasksDir)
    ? readdirSync(wazaTasksDir)
        .filter(name => name.endsWith('.yaml'))
        .sort(asciiCompare)
        .map(name => `waza/skills/plan-product/tasks/${name}`)
    : [];
  const files = [
    'scenarios/product-planning/README.md',
    'scenarios/product-planning/baseline.json',
    'scenarios/product-planning/cases.json',
    'scenarios/product-planning/prepare.mjs',
    'waza/skills/plan-product/eval.yaml',
    ...wazaTaskFiles,
  ].sort(asciiCompare);

  const hash = createHash('sha256');
  for (const rel of files) {
    const content = normalizeLineEndingsBytes(readFileSync(path.join(evalsDir, rel)));
    hash.update(Buffer.from(rel, 'utf8'));
    hash.update(Buffer.from([0]));
    hash.update(content);
    hash.update(Buffer.from([0]));
  }
  return hash.digest('hex');
}

function isSafeRelativeSubpath(relPath) {
  if (typeof relPath !== 'string' || !relPath.trim()) return false;
  if (path.isAbsolute(relPath) || relPath.startsWith('/') || relPath.startsWith('\\')) return false;
  const parts = relPath.split(/[\\/]/);
  return !parts.includes('..');
}

function isZipBuffer(buf) {
  if (buf.length < 4) return false;
  return (
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    ((buf[2] === 0x03 && buf[3] === 0x04) || (buf[2] === 0x05 && buf[3] === 0x06))
  );
}

function parseIsoTimestamp(value, metaPath) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid ISO timestamp in ${metaPath}`);
  }
}

function loadRecords(root, kind, matrixKeyIds) {
  const evRoot = evidenceRoot(root);
  const candidateDir = existsSync(path.join(evRoot, kind))
    ? path.join(evRoot, kind)
    : path.join(root, 'evals', kind);
  const output = [];
  if (!existsSync(candidateDir)) return output;

  const subdirs = readdirSync(candidateDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort(asciiCompare);
  for (const sub of subdirs) {
    const metaPath = path.join(candidateDir, sub, 'metadata.json');
    if (!existsSync(metaPath)) continue;
    const data = readJson(metaPath);
    if (!Array.isArray(data.key) || data.key.length !== 4 || !matrixKeyIds.has(rowKeyId(data.key))) {
      throw new Error(`Undeclared evaluation row: ${metaPath}`);
    }
    output.push([metaPath, data]);
  }
  return output;
}

function selectLatest(items) {
  if (items.length === 0) return null;
  return items.reduce((best, cur) => {
    const aTime = best[1].completed_at;
    const bTime = cur[1].completed_at;
    if (bTime > aTime) return cur;
    if (bTime < aTime) return best;
    return path.basename(path.dirname(cur[0])) > path.basename(path.dirname(best[0])) ? cur : best;
  });
}

function validateCompletedReceipt(metaPath, data, root, matrix) {
  if (data.state !== 'completed' || data.verified !== true) {
    throw new Error(`Result is not completed and verified: ${metaPath}`);
  }
  if ((data.outcome !== 'Pass' && data.outcome !== 'Fail') || typeof data.score !== 'number' || Number.isNaN(data.score)) {
    throw new Error(`Result has no real scored outcome: ${metaPath}`);
  }
  if (data.score < 0 || data.score > 100) {
    throw new Error(`Result score out of range: ${metaPath}`);
  }
  const requiredFields = [
    'host_version',
    'model',
    'artifact',
    'artifact_sha256',
    'suite_sha256',
    'scoring_method',
    'reviewer',
    'review_method',
    'critical_failures',
    'case_outcomes',
  ];
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === '') {
      throw new Error(`Result lacks ${field}: ${metaPath}`);
    }
  }
  if (data.host !== data.key[1] || data.platform !== data.key[2] || data.config !== data.key[3]) {
    throw new Error(`Result host/platform/config disagrees with row: ${metaPath}`);
  }
  if (!Array.isArray(data.critical_failures) || !Array.isArray(data.case_outcomes) || data.case_outcomes.length === 0) {
    throw new Error(`Result case or failure record has wrong shape: ${metaPath}`);
  }
  if (data.reviewer_independent !== true) {
    throw new Error(`Result lacks independent review: ${metaPath}`);
  }
  if (data.critical_failures.length > 0 && data.outcome === 'Pass') {
    throw new Error(`Critical failure cannot pass release: ${metaPath}`);
  }
  if (data.suite_revision !== matrix.suite_revision || data.suite_sha256 !== suiteSha256(root, data.key[0])) {
    throw new Error(`Suite source hash or revision mismatch: ${metaPath}`);
  }
  if (!isSafeRelativeSubpath(data.artifact)) {
    throw new Error(`Unsafe artifact path: ${metaPath}`);
  }
  const artifactPath = path.join(path.dirname(metaPath), data.artifact);
  if (!existsSync(artifactPath)) {
    throw new Error(`Result artifact missing: ${metaPath}`);
  }
  const artifactBytes = readFileSync(artifactPath);
  if (sha256Hex(artifactBytes) !== data.artifact_sha256 || !isZipBuffer(artifactBytes)) {
    throw new Error(`Result artifact hash mismatch or invalid ZIP archive: ${metaPath}`);
  }
  if (!isSafeRelativeSubpath(data.evidence)) {
    throw new Error(`Unsafe result evidence path: ${metaPath}`);
  }
  const evidencePath = path.join(path.dirname(metaPath), data.evidence);
  if (!existsSync(evidencePath)) {
    throw new Error(`Result evidence missing: ${metaPath}`);
  }
  const evidenceBytes = readFileSync(evidencePath);
  if (!matchesSha256(evidenceBytes, data.evidence_sha256)) {
    throw new Error(`Result evidence hash mismatch: ${metaPath}`);
  }
  const evidenceJson = JSON.parse(evidenceBytes.toString('utf8'));
  if (
    evidenceJson.reviewer !== data.reviewer ||
    evidenceJson.reviewer_independent !== true ||
    JSON.stringify(evidenceJson.case_outcomes) !== JSON.stringify(data.case_outcomes)
  ) {
    throw new Error(`Independent review receipt disagrees with result: ${metaPath}`);
  }
  const tracePath = path.join(path.dirname(metaPath), 'host-trace.json');
  if (!existsSync(tracePath)) {
    throw new Error(`Result lacks host invocation trace: ${metaPath}`);
  }
  const trace = readJson(tracePath);
  if (
    trace.host !== data.host ||
    !Array.isArray(trace.invocations) ||
    trace.invocations.length === 0
  ) {
    throw new Error(`Result has no structured host invocation evidence: ${metaPath}`);
  }
  parseIsoTimestamp(data.completed_at, metaPath);
}

function validateAttemptReceipt(metaPath, data) {
  if (!['incomplete', 'aborted', 'unverified'].includes(data.state)) {
    throw new Error(`Attempt has invalid state: ${metaPath}`);
  }
  for (const field of ['started_at', 'completed_at', 'stage', 'diagnostic', 'next_check', 'candidate_sha256']) {
    if (!data[field]) {
      throw new Error(`Attempt lacks ${field}: ${metaPath}`);
    }
  }
  parseIsoTimestamp(data.completed_at, metaPath);
}

function isCurrentReceipt(root, data, currentHash, suiteRevision) {
  return (
    data.candidate_sha256 === currentHash &&
    data.suite_revision === suiteRevision &&
    data.suite_sha256 === suiteSha256(root, data.key[0])
  );
}

function computeRowStatuses(root) {
  const matrixPath = path.join(root, 'evals/matrix.json');
  const matrix = readJson(matrixPath);
  if (matrix.schema !== 1 || typeof matrix.suite_revision !== 'string' || !Array.isArray(matrix.rows) || matrix.rows.length === 0) {
    throw new Error('evals/matrix.json must conform to schema 1 with suite_revision and non-empty rows');
  }
  const matrixKeyIds = new Set();
  for (const row of matrix.rows) {
    const id = rowKeyId(rowKeyTuple(row));
    if (matrixKeyIds.has(id)) {
      throw new Error('Coverage matrix contains duplicate keys');
    }
    matrixKeyIds.add(id);
  }

  const results = loadRecords(root, 'results', matrixKeyIds);
  const attempts = loadRecords(root, 'attempts', matrixKeyIds);
  for (const [metaPath, data] of results) {
    validateCompletedReceipt(metaPath, data, root, matrix);
  }
  for (const [metaPath, data] of attempts) {
    validateAttemptReceipt(metaPath, data);
  }

  const current = candidateSha256(root);
  const statuses = matrix.rows.map(row => {
    const rowId = rowKeyId(rowKeyTuple(row));
    const matching = results.filter(([, d]) => rowKeyId(d.key) === rowId);
    const currentMatches = matching.filter(([, d]) => isCurrentReceipt(root, d, current, matrix.suite_revision));
    const selected = selectLatest(currentMatches) || selectLatest(matching);
    const selectedAttempt = selectLatest(attempts.filter(([, d]) => rowKeyId(d.key) === rowId));

    let resultLink = 'Not run';
    let outcome = 'Score unavailable';
    let freshness = 'No result';
    let data = null;
    if (selected) {
      const [metaPath, rec] = selected;
      data = rec;
      resultLink = `\`${path.basename(path.dirname(metaPath))}\``;
      outcome = `${rec.outcome} / ${rec.score}/100`;
      freshness = isCurrentReceipt(root, rec, current, matrix.suite_revision) ? 'Current' : 'Stale';
    }

    let attemptText = row.remaining;
    if (selectedAttempt && (!selected || selectedAttempt[1].completed_at > selected[1].completed_at)) {
      const [attPath, att] = selectedAttempt;
      const attLink = `\`${path.basename(path.dirname(attPath))}\``;
      attemptText = att.candidate_sha256 === current
        ? `${attLink}: ${att.state}; ${att.next_check}`
        : `${attLink}: ${att.state} on an earlier candidate; ${row.remaining}`;
    }

    return {
      row,
      data,
      resultLink,
      outcome,
      freshness,
      attemptText,
      passing: Boolean(data && data.outcome === 'Pass' && freshness === 'Current'),
    };
  });

  return { matrix, current, statuses };
}

/**
 * Render evals/LATEST.md content and release readiness boolean for repoRoot.
 */
export function render(repoRoot = DEFAULT_ROOT) {
  const root = path.resolve(repoRoot);
  const { matrix, current, statuses } = computeRowStatuses(root);
  const lines = [
    '# Latest plugin evaluation',
    '',
    'Generated from [matrix.json](matrix.json), [scenarios/product-planning/cases.json](scenarios/product-planning/cases.json), [waza/skills/plan-product/eval.yaml](waza/skills/plan-product/eval.yaml), and verified `.temp/evals/evidence/` receipts by `node evals/report.mjs generate`.',
    `Candidate SHA-256: \`${current}\`. Suite revision: \`${matrix.suite_revision}\`.`,
    '',
    'A missing or failing required row blocks release. A consistent report does not imply release readiness.',
    '',
    'Offline deterministic gates (`npm run validate`, `npm test`, `npm run eval:prepare`, and Waza trigger checks) verify static contracts locally; native host rows require isolated execution outside `repo_root`. See [README.md](README.md) for workflow instructions.',
    '',
    '| Suite | Harness | Platform | Configuration | Required | Latest completed result | Outcome / score | Freshness | Newer attempt / next check |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  let ready = true;
  for (const status of statuses) {
    const { row } = status;
    if (row.required && !status.passing) ready = false;
    const cells = [
      ...rowKeyTuple(row),
      row.required ? 'Yes' : 'No',
      status.resultLink,
      status.outcome,
      status.freshness,
      status.attemptText,
    ].map(cell => String(cell).replaceAll('|', '\\|').replaceAll('\n', ' '));
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push(
    '',
    `Release acceptance: **${ready ? 'Pass' : 'Fail — required evidence missing, stale, or failing'}**.`,
    ''
  );
  return { report: lines.join('\n'), ready, candidateSha256: current, suiteRevision: matrix.suite_revision };
}

function cleanCheckoutReportMatches(existing, renderedEmpty) {
  const existingLines = existing.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  const renderedLines = renderedEmpty.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  if (existingLines.length !== renderedLines.length) return false;
  if (
    existingLines.slice(0, 11).join('\n') !== renderedLines.slice(0, 11).join('\n') ||
    existingLines.slice(-2).join('\n') !== renderedLines.slice(-2).join('\n')
  ) {
    return false;
  }
  if (!existingLines[existingLines.length - 1].includes('Release acceptance: **Fail')) {
    return false;
  }
  for (let i = 11; i < existingLines.length - 2; i++) {
    const exCells = existingLines[i].replace(/^\|\s*/, '').replace(/\s*\|$/, '').split('|').map(c => c.trim());
    const renCells = renderedLines[i].replace(/^\|\s*/, '').replace(/\s*\|$/, '').split('|').map(c => c.trim());
    if (exCells.length !== 9 || renCells.length !== 9) return false;
    if (exCells.slice(0, 5).join('\0') !== renCells.slice(0, 5).join('\0')) return false;
    if (exCells[5] !== 'Not run' && exCells[7] !== 'Stale') return false;
  }
  return true;
}

/**
 * Execute generate | check | release | hash against repoRoot.
 */
export function runReport(command, options = {}) {
  const validCommands = new Set(['generate', 'check', 'release', 'hash']);
  if (!validCommands.has(command)) {
    throw new Error(`Unsupported report command "${command}". Expected one of: generate, check, release, hash`);
  }
  const root = path.resolve(options.repoRoot || DEFAULT_ROOT);
  if (command === 'hash') {
    const hash = candidateSha256(root);
    return { exitCode: 0, stdout: hash, stderr: '' };
  }

  const { report, ready } = render(root);
  const latestPath = path.join(root, 'evals/LATEST.md');
  if (command === 'generate') {
    writeFileSync(latestPath, report, 'utf8');
    return { exitCode: 0, stdout: latestPath, stderr: '' };
  }

  if (!existsSync(latestPath)) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'LATEST.md differs from evidence; run generate and inspect the diff',
    };
  }

  const existing = readFileSync(latestPath, 'utf8').replace(/\r\n/g, '\n');
  const consistent =
    existing === report ||
    (command === 'check' && !existsSync(evidenceRoot(root)) && cleanCheckoutReportMatches(existing, report));
  if (!consistent) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'LATEST.md differs from evidence; run generate and inspect the diff',
    };
  }

  if (command === 'release' && !ready) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: 'Release acceptance failed: required rows lack current passing evidence',
    };
  }

  return {
    exitCode: 0,
    stdout: `Report consistent${ready ? '; release ready' : '; release incomplete'}`,
    stderr: '',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2];
    const result = runReport(command);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
