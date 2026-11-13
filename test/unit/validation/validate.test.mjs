import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assemble } from '../../../scripts/assemble.mjs';
import { candidateSha256, runReport, sourceInventory } from '../../../evals/report.mjs';
import { initialize } from '../../../src/init/init.mjs';
import { validate } from '../../../src/validation/validate.mjs';

const pluginRoot = path.resolve(import.meta.dirname, '../../..');

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'plan-product-validate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  initialize(root, { userHome: null });
  return root;
}

test('validate enforces docs/ allowed-set lockdown, mandatory GLOSSARY.md, and runtime_root usage boundary', t => {
  const root = fixture(t);
  assert.doesNotThrow(() => validate(root));

  // Disallowed extra file in docs/
  writeFileSync(path.join(root, 'docs/roadmap.md'), '# Legacy\n');
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, 'docs/roadmap.md'));

  // Disallowed directory in docs/
  mkdirSync(path.join(root, 'docs/refinement-plans'), { recursive: true });
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, 'docs/refinement-plans'), { recursive: true, force: true });

  // Disallowed README.md directly under docs/features/
  mkdirSync(path.join(root, 'docs/features'), { recursive: true });
  writeFileSync(path.join(root, 'docs/features/README.md'), '# Extra\n');
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, 'docs/features/README.md'));

  // Missing docs/GLOSSARY.md fails validation
  const glossaryBackup = path.join(root, 'docs/GLOSSARY.md');
  rmSync(glossaryBackup);
  assert.throws(() => validate(root), /Validation failed/);
  initialize(root, { userHome: null });
  assert.doesNotThrow(() => validate(root));

  // Mutable usage directly under .nyssa-ai/plan-product/usage fails, while runtime/usage passes
  mkdirSync(path.join(root, '.nyssa-ai/plan-product/usage'), { recursive: true });
  assert.throws(() => validate(root), /Validation failed/);
  rmSync(path.join(root, '.nyssa-ai/plan-product/usage'), { recursive: true, force: true });

  mkdirSync(path.join(root, '.nyssa-ai/plan-product/runtime/usage'), { recursive: true });
  writeFileSync(path.join(root, '.nyssa-ai/plan-product/runtime/usage/events.jsonl'), '{}\n');
  assert.doesNotThrow(() => validate(root));
});

test('validate permits Canonical in feature titles while banning Surgical, Storage, Ingestion, and Syndication', t => {
  const root = fixture(t);
  mkdirSync(path.join(root, 'docs/features/f-01.01'), { recursive: true });
  const featPath = path.join(root, 'docs/features/f-01.01/feature.md');

  writeFileSync(
    featPath,
    '---\nid: F-01.01\ngroup: "01"\nstatus: planned\n---\n\n# F-01.01 Maintain Canonical Planning Contracts without Losing Notes\n\n## Summary\n Align contracts.\n\n## Conceptual Context\nNone.\n'
  );
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Product Feature Progress\n\n## Feature Checklist Summary\n\n- [ ] F-01.01: Maintain Canonical Planning Contracts without Losing Notes\n\n## Feature Inventory\n\n[Feature Guide](features/f-01.01/feature.md)\n'
  );
  assert.doesNotThrow(() => validate(root));

  // Broken relative link in authored (non-template-only) docs/features.md fails validation
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Product Feature Progress\n\n## Feature Inventory\n\n[Missing Feature](features/f-99.99/feature.md)\n'
  );
  assert.throws(() => validate(root), /Validation failed/);
  writeFileSync(
    path.join(root, 'docs/features.md'),
    '# Product Feature Progress\n\n## Feature Checklist Summary\n\n- [ ] F-01.01: Maintain Canonical Planning Contracts without Losing Notes\n\n## Feature Inventory\n\n[Feature Guide](features/f-01.01/feature.md)\n'
  );

  for (const bannedWord of ['Surgical', 'Storage', 'Ingestion', 'Syndication']) {
    writeFileSync(
      featPath,
      `---\nid: F-01.01\ngroup: "01"\nstatus: planned\n---\n\n# F-01.01 Perform ${bannedWord} Task Updates\n\n## Summary\nBad title.\n`
    );
    assert.throws(() => validate(root), /Validation failed/, `Expected ${bannedWord} to fail validation`);
  }
});

test('validate enforces Concept Kind (kind: flow | domain-model), bi-directional links, and DP-pp.ss steps', t => {
  const root = fixture(t);
  mkdirSync(path.join(root, 'docs/concepts'), { recursive: true });
  mkdirSync(path.join(root, 'docs/features/f-01.01'), { recursive: true });
  mkdirSync(path.join(root, 'docs/plans'), { recursive: true });

  const cPath = path.join(root, 'docs/concepts/c-01-order-fulfillment.md');
  const fPath = path.join(root, 'docs/features/f-01.01/feature.md');
  const dpPath = path.join(root, 'docs/plans/development-plan.md');

  const validConcept = [
    '---',
    'id: C-01',
    'kind: flow',
    'status: active',
    '---',
    '',
    '# C-01: Order Fulfillment',
    '',
    '## Summary',
    'End-to-end order lifecycle.',
    '',
    '## Core Model / Stages',
    '- Draft -> Paid -> Shipped',
    '',
    '## Invariants & Rules',
    '- Cannot cancel after shipping.',
    '',
    '## Participating Features',
    '- [F-01.01: Complete Orders with Verified Payment](../features/f-01.01/feature.md) — initiates order.',
    '',
  ].join('\n');

  const validFeature = [
    '---',
    'id: F-01.01',
    'group: "01"',
    'status: planned',
    '---',
    '',
    '# F-01.01 Complete Orders with Verified Payment',
    '',
    '## Summary',
    'Customer checkout.',
    '',
    '## User Need',
    'Buy items.',
    '',
    '## Conceptual Context',
    '- [C-01: Order Fulfillment](../../concepts/c-01-order-fulfillment.md) — initiates order.',
    '',
    '## Use Cases',
    'None yet.',
    '',
  ].join('\n');

  writeFileSync(cPath, validConcept);
  writeFileSync(fPath, validFeature);
  writeFileSync(
    dpPath,
    '# Development Plan\n\n## Steps\n\n- [ ] DP-01.01: Deliver order checkout — [F-01.01](../features/f-01.01/feature.md)\n    - Verify: complete checkout.\n'
  );
  assert.doesNotThrow(() => validate(root));

  // Retired type: frontmatter fails validation
  writeFileSync(cPath, validConcept.replace('kind: flow', 'type: flow'));
  assert.throws(() => validate(root), /Validation failed/);
  writeFileSync(cPath, validConcept);

  // Missing reciprocal link in feature.md fails validation
  writeFileSync(
    fPath,
    validFeature.replace('- [C-01: Order Fulfillment](../../concepts/c-01-order-fulfillment.md) — initiates order.', 'None.')
  );
  assert.throws(() => validate(root), /Validation failed/);
  writeFileSync(fPath, validFeature);

  // Legacy R-01.01 step ID in development-plan.md fails validation
  writeFileSync(
    dpPath,
    '# Development Plan\n\n## Steps\n\n- [ ] R-01.01: Deliver order checkout — [F-01.01](../features/f-01.01/feature.md)\n'
  );
  assert.throws(() => validate(root), /Validation failed/);
});

test('assemble stages deterministic portable, antigravity, and hermes bundles and guards --output-dir', t => {
  const sandbox = mkdtempSync(path.join(os.tmpdir(), 'plan-product-assemble-unit-'));
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));

  const outDir = path.join(sandbox, 'staged');
  assemble('write', { outputDir: outDir });
  assert.doesNotThrow(() => assemble('check', { outputDir: outDir }));

  const canonical = JSON.parse(readFileSync(path.join(pluginRoot, 'plugin.json'), 'utf8'));

  // 1. Verify deterministic assembly.json across all 3 bundles
  for (const [bundleName, expectedFormat] of [
    ['portable', 'portable-plugin'],
    ['antigravity', 'antigravity-plugin'],
    ['hermes', 'hermes-plugin'],
  ]) {
    const assemblyMeta = JSON.parse(
      readFileSync(path.join(outDir, bundleName, 'assembly.json'), 'utf8')
    );
    assert.equal(assemblyMeta.format, expectedFormat);
    assert.equal(assemblyMeta.source, 'scripts/assemble.mjs');
    assert.equal(assemblyMeta.version, canonical.version);
    assert.match(assemblyMeta.source_sha256, /^[0-9a-f]{64}$/);
  }

  // Re-running write produces identical source_sha256 digests
  const outDirRepeat = path.join(sandbox, 'staged-repeat');
  assemble('write', { outputDir: outDirRepeat });
  for (const bundleName of ['portable', 'antigravity', 'hermes']) {
    assert.equal(
      readFileSync(path.join(outDir, bundleName, 'assembly.json'), 'utf8'),
      readFileSync(path.join(outDirRepeat, bundleName, 'assembly.json'), 'utf8')
    );
  }

  // 2. Verify portable bundle contents
  const portableGemini = JSON.parse(
    readFileSync(path.join(outDir, 'portable/gemini-extension.json'), 'utf8')
  );
  assert.equal('contextFileName' in portableGemini, false);
  assert.deepEqual(Object.keys(portableGemini).sort(), ['description', 'name', 'version']);
  const portableTessl = JSON.parse(
    readFileSync(path.join(outDir, 'portable/.tessl-plugin/plugin.json'), 'utf8')
  );
  assert.equal(portableTessl.skills, './skills');
  assert.ok(existsSync(path.join(outDir, 'portable/LICENSE')));
  assert.ok(existsSync(path.join(outDir, 'portable/package.json')));
  assert.ok(existsSync(path.join(outDir, 'portable/commands/plan-concept.md')));
  assert.ok(existsSync(path.join(outDir, 'portable/src/init/init.mjs')));

  // 3. Verify antigravity bundle manifest & command-to-skill conversion
  const agyManifest = JSON.parse(
    readFileSync(path.join(outDir, 'antigravity/plugin.json'), 'utf8')
  );
  assert.deepEqual(agyManifest, {
    $schema: 'https://antigravity.google/schemas/v1/plugin.json',
    name: canonical.name,
    version: canonical.version,
    description: canonical.description,
    author: canonical.author,
    homepage: canonical.homepage,
    repository: canonical.repository,
  });
  assert.equal(existsSync(path.join(outDir, 'antigravity/commands')), false);
  const cmdFiles = readdirSync(path.join(pluginRoot, 'commands'))
    .filter(f => f.endsWith('.md'))
    .map(f => path.basename(f, '.md'))
    .sort();
  assert.deepEqual(
    readdirSync(path.join(outDir, 'antigravity/skills')).sort(),
    ['plan-product', ...cmdFiles.map(cmd => `plan-product-cmd-${cmd}`)].sort()
  );
  for (const cmd of cmdFiles) {
    const convertedSkill = readFileSync(
      path.join(outDir, `antigravity/skills/plan-product-cmd-${cmd}/SKILL.md`),
      'utf8'
    );
    assert.match(convertedSkill, new RegExp(`^---\\nname: plan-product-cmd-${cmd}\\ndescription: .+\\n---\\n\\n`));
    assert.ok(convertedSkill.includes('> [!IMPORTANT] Scope Directive'));
  }

  // 4. Verify hermes bundle manifest & __init__.py shim
  const hermesYaml = readFileSync(path.join(outDir, 'hermes/plugin.yaml'), 'utf8');
  assert.equal(
    hermesYaml,
    [
      `name: ${JSON.stringify(canonical.name)}`,
      `version: ${JSON.stringify(canonical.version)}`,
      `description: ${JSON.stringify(canonical.description)}`,
    ].join('\n') + '\n'
  );
  assert.equal(
    readFileSync(path.join(outDir, 'hermes/__init__.py'), 'utf8'),
    readFileSync(path.join(pluginRoot, 'harness-adapters/hermes/plugin.py'), 'utf8')
  );
  assert.ok(existsSync(path.join(outDir, 'hermes/skills/plan-product/SKILL.md')));
  assert.ok(existsSync(path.join(outDir, 'hermes/src/validation/validate.mjs')));

  // 5. Drift detection on extra file & modified file, while ignoring Python __pycache__ from hermes validate
  mkdirSync(path.join(outDir, 'hermes/__pycache__'), { recursive: true });
  writeFileSync(path.join(outDir, 'hermes/__pycache__/__init__.cpython-314.pyc'), 'pyc');
  assert.doesNotThrow(() => assemble('check', { outputDir: outDir }));
  const extraFile = path.join(outDir, 'hermes/unexpected.txt');
  writeFileSync(extraFile, 'stray\n');
  assert.throws(() => assemble('check', { outputDir: outDir }), /drift/i);
  assemble('write', { outputDir: outDir });
  assert.equal(existsSync(extraFile), false);
  assert.equal(existsSync(path.join(outDir, 'hermes/__pycache__')), false);
  assert.doesNotThrow(() => assemble('check', { outputDir: outDir }));

  // 6. Reject repo_root, non-.temp in-repo dirs, and symlinks as --output-dir
  assert.throws(() => assemble('write', { outputDir: pluginRoot }), /repo_root/);
  assert.throws(
    () => assemble('write', { outputDir: path.join(pluginRoot, '.agents/plugins') }),
    /\.temp/
  );
  const realTarget = path.join(sandbox, 'real-target');
  mkdirSync(realTarget);
  const symlinkOut = path.join(sandbox, 'symlink-out');
  symlinkSync(realTarget, symlinkOut);
  assert.throws(() => assemble('write', { outputDir: symlinkOut }), /symlink/i);
});

test('validate plugin mode enforces gemini-extension safety, tessl ./skills, and harness-adapters/hermes/plugin.py', t => {
  const tempPlugin = mkdtempSync(path.join(os.tmpdir(), 'plan-product-plugin-validate-'));
  t.after(() => rmSync(tempPlugin, { recursive: true, force: true }));

  for (const item of [
    'plugin.json',
    'package.json',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.gitattributes',
    '.gitignore',
    'skills',
    'commands',
    'harness-adapters',
    'scripts',
    'src',
    'docs',
    'evals',
  ]) {
    cpSync(path.join(pluginRoot, item), path.join(tempPlugin, item), { recursive: true });
  }
  assemble('write', { repoRoot: tempPlugin, outputDir: path.join(tempPlugin, '.temp/dist') });
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // Leak of contextFileName in gemini-extension.json fails validation
  const geminiPath = path.join(tempPlugin, 'gemini-extension.json');
  const safeGemini = readFileSync(geminiPath, 'utf8');
  writeFileSync(
    geminiPath,
    JSON.stringify({ ...JSON.parse(safeGemini), contextFileName: 'GEMINI.md' }, null, 2) + '\n'
  );
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  writeFileSync(geminiPath, safeGemini);

  // Unnormalized skills path in .tessl-plugin/plugin.json fails validation
  const tesslPath = path.join(tempPlugin, '.tessl-plugin/plugin.json');
  const safeTessl = readFileSync(tesslPath, 'utf8');
  writeFileSync(
    tesslPath,
    JSON.stringify({ ...JSON.parse(safeTessl), skills: 'skills' }, null, 2) + '\n'
  );
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  writeFileSync(tesslPath, safeTessl);

  // Missing harness-adapters/hermes/plugin.py fails validation
  const hermesPath = path.join(tempPlugin, 'harness-adapters/hermes/plugin.py');
  const hermesBackup = readFileSync(hermesPath, 'utf8');
  rmSync(hermesPath);
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  writeFileSync(hermesPath, hermesBackup);
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // Legacy matrix.json (missing schema: 1) or duplicate row keys fail validation
  const matrixPath = path.join(tempPlugin, 'evals/matrix.json');
  const validMatrixText = readFileSync(matrixPath, 'utf8');
  const validMatrix = JSON.parse(validMatrixText);
  writeFileSync(matrixPath, JSON.stringify({ plugin: 'plan-product', hosts: [], suites: [] }, null, 2) + '\n');
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  writeFileSync(
    matrixPath,
    JSON.stringify({ ...validMatrix, rows: [validMatrix.rows[0], validMatrix.rows[0]] }, null, 2) + '\n'
  );
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  writeFileSync(matrixPath, validMatrixText);
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // Multi-task sequence YAML ("- id: ...") or invalid grader skill_path/mode in Waza tasks fails validation
  const badTaskPath = path.join(tempPlugin, 'evals/waza/skills/plan-product/tasks/bad-sequence.yaml');
  writeFileSync(
    badTaskPath,
    '- id: bad-seq\n  name: Bad list\n  inputs:\n    prompt: "Plan product"\n  graders:\n    - type: trigger\n      config:\n        skill_path: skills/plan-product/SKILL.md\n        mode: positive\n'
  );
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);

  writeFileSync(
    badTaskPath,
    'id: bad-skill-path\nname: Bad skill path\ninputs:\n  prompt: "Plan product"\ngraders:\n  - type: trigger\n    config:\n      skill_path: skills/nonexistent/SKILL.md\n      mode: positive\n'
  );
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);

  writeFileSync(
    badTaskPath,
    'id: bad-mode\nname: Bad mode\ninputs:\n  prompt: "Plan product"\ngraders:\n  - type: trigger\n    config:\n      skill_path: skills/plan-product/SKILL.md\n      mode: neutral\n'
  );
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  rmSync(badTaskPath);
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // License drift between plugin.json and package.json or non-Apache-2.0 license fails validation
  const pkgPath = path.join(tempPlugin, 'package.json');
  const validPkgText = readFileSync(pkgPath, 'utf8');
  writeFileSync(pkgPath, JSON.stringify({ ...JSON.parse(validPkgText), license: 'MIT' }, null, 2) + '\n');
  assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
  writeFileSync(pkgPath, validPkgText);
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));
});

test('evals/report.mjs computes CRLF-normalized Candidate SHA-256 and gates stale LATEST.md', t => {
  const tempPlugin = mkdtempSync(path.join(os.tmpdir(), 'plan-product-report-unit-'));
  t.after(() => rmSync(tempPlugin, { recursive: true, force: true }));

  for (const item of [
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
  ]) {
    cpSync(path.join(pluginRoot, item), path.join(tempPlugin, item), { recursive: true });
  }

  const inv = sourceInventory(tempPlugin);
  assert.equal('evals/LATEST.md' in inv, false);
  assert.ok('evals/matrix.json' in inv);
  assert.ok('skills/plan-product/SKILL.md' in inv);

  const initialHash = candidateSha256(tempPlugin);
  assert.match(initialHash, /^[0-9a-f]{64}$/);
  assert.equal(runReport('hash', { repoRoot: tempPlugin }).stdout, initialHash);

  // CRLF conversion on text files preserves Candidate SHA-256; .temp/ files are ignored
  const readmePath = path.join(tempPlugin, 'README.md');
  const lfReadme = readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n');
  writeFileSync(readmePath, lfReadme.replace(/\n/g, '\r\n'), 'utf8');
  mkdirSync(path.join(tempPlugin, '.temp/evals/scratch'), { recursive: true });
  writeFileSync(path.join(tempPlugin, '.temp/evals/scratch/ignore.txt'), 'ephemeral\n');
  assert.equal(candidateSha256(tempPlugin), initialHash);

  // generate -> check passes; release fails when required host evidence is missing
  assert.equal(runReport('generate', { repoRoot: tempPlugin }).exitCode, 0);
  const checkOk = runReport('check', { repoRoot: tempPlugin });
  assert.equal(checkOk.exitCode, 0);
  assert.match(checkOk.stdout, /Report consistent; release incomplete/);
  const releaseRes = runReport('release', { repoRoot: tempPlugin });
  assert.equal(releaseRes.exitCode, 1);
  assert.match(releaseRes.stderr, /Release acceptance failed/);

  // Mutating a tracked source file invalidates Candidate SHA-256 and causes check to fail until regenerated
  writeFileSync(readmePath, lfReadme + '\n<!-- candidate change -->\n', 'utf8');
  assert.notEqual(candidateSha256(tempPlugin), initialHash);
  const staleCheck = runReport('check', { repoRoot: tempPlugin });
  assert.equal(staleCheck.exitCode, 1);
  assert.match(staleCheck.stderr, /LATEST\.md differs from evidence/);
});

test('validate plugin mode enforces cross-plugin compliance (root bans, .gitattributes LF, docs gitignore, SKILL.md BOM/1024/Verification, retired Codex/agents trees, and path/token leaks)', t => {
  const tempPlugin = mkdtempSync(path.join(os.tmpdir(), 'plan-product-dim7-validate-'));
  t.after(() => rmSync(tempPlugin, { recursive: true, force: true }));

  for (const item of [
    'plugin.json',
    'gemini-extension.json',
    'package.json',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.gitattributes',
    '.gitignore',
    '.claude-plugin',
    '.codex-plugin',
    '.cursor-plugin',
    '.tessl-plugin',
    'skills',
    'commands',
    'harness-adapters',
    'scripts',
    'src',
    'docs',
    'evals',
  ]) {
    cpSync(path.join(pluginRoot, item), path.join(tempPlugin, item), { recursive: true });
  }

  function expectValidationFailure(expectedPattern) {
    const captured = [];
    const origError = console.error;
    console.error = (...args) => captured.push(args.join(' '));
    try {
      assert.throws(() => validate(tempPlugin, { validatePlugin: true, userHome: null }), /Validation failed/);
    } finally {
      console.error = origError;
    }
    const joined = captured.join('\n');
    assert.match(joined, expectedPattern, `Expected error matching ${expectedPattern}, got:\n${joined}`);
  }

  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // 1. Self-loaded (.agents, .hermes) and retired (artifacts, adapters) root directories ban
  for (const [dirName, pattern] of [
    ['.agents', /Forbidden self-loaded host directory.*\.agents\//],
    ['.hermes', /Forbidden self-loaded host directory.*\.hermes\//],
    ['artifacts', /Retired 'artifacts\/' directory/],
    ['adapters', /Retired 'adapters\/' directory/],
  ]) {
    const dirFull = path.join(tempPlugin, dirName);
    mkdirSync(dirFull);
    expectValidationFailure(pattern);
    rmSync(dirFull, { recursive: true, force: true });
  }
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // 2. .gitattributes LF check (missing file or missing eol=lf)
  const gitattributesPath = path.join(tempPlugin, '.gitattributes');
  const validGitattributes = readFileSync(gitattributesPath, 'utf8');
  rmSync(gitattributesPath);
  expectValidationFailure(/Missing root \.gitattributes/);
  writeFileSync(gitattributesPath, '# comment eol=lf\n* text=auto\n', 'utf8');
  expectValidationFailure(/\.gitattributes must enforce LF line endings/);
  writeFileSync(gitattributesPath, validGitattributes, 'utf8');
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // 3. docs/ gitignore check (.gitignore rule and git check-ignore when .git exists)
  const gitignorePath = path.join(tempPlugin, '.gitignore');
  const validGitignore = readFileSync(gitignorePath, 'utf8');
  writeFileSync(gitignorePath, `${validGitignore}\ndocs/\n`, 'utf8');
  expectValidationFailure(/'docs\/' directory must be tracked in Git and never ignored in \.gitignore/);
  writeFileSync(gitignorePath, validGitignore, 'utf8');

  execFileSync('git', ['init', '-q'], { cwd: tempPlugin });
  writeFileSync(path.join(tempPlugin, '.git/info/exclude'), 'docs/\n', 'utf8');
  expectValidationFailure(/git check-ignore matched docs/);
  rmSync(path.join(tempPlugin, '.git'), { recursive: true, force: true });
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // 4. SKILL.md BOM, name, description <= 1024, ## Verification, and workflow non-code-span links
  const skillPath = path.join(tempPlugin, 'skills/plan-product/SKILL.md');
  const validSkill = readFileSync(skillPath, 'utf8');

  writeFileSync(skillPath, `\uFEFF${validSkill}`, 'utf8');
  expectValidationFailure(/SKILL\.md must not contain a UTF-8 BOM/);

  writeFileSync(skillPath, validSkill.replace('name: plan-product', 'name: wrong-name'), 'utf8');
  expectValidationFailure(/SKILL\.md frontmatter name must be "plan-product"/);

  const oversizedDesc = 'Use this skill when planning products. '.repeat(30);
  writeFileSync(
    skillPath,
    validSkill.replace(/^description:[\s\S]*?^---/m, `description: "${oversizedDesc}"\n---`),
    'utf8'
  );
  expectValidationFailure(/SKILL\.md frontmatter description exceeds 1024-character limit/);

  writeFileSync(skillPath, validSkill.replace('## Verification', '## Exit Summary'), 'utf8');
  expectValidationFailure(/SKILL\.md missing '## Verification' section/);
  writeFileSync(skillPath, validSkill, 'utf8');

  const wfPath = path.join(tempPlugin, 'skills/plan-product/workflows/concept.md');
  const validWf = readFileSync(wfPath, 'utf8');
  writeFileSync(wfPath, validWf.replace('## Verification Checklist', '## Exit Summary'), 'utf8');
  expectValidationFailure(/workflows\/concept\.md missing '## Verification' section/);

  writeFileSync(wfPath, `${validWf}\nUnescaped example [UC-01.01.01](<path>) in prose.\n`, 'utf8');
  expectValidationFailure(/Broken relative link in skills\/plan-product\/workflows\/concept\.md: path/);
  writeFileSync(wfPath, validWf, 'utf8');
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // 5. Retired skills/*/agents/ (openai.yaml) and harness-adapters/codex/**/openai.yaml ban
  const retiredSkillAgentsDir = path.join(tempPlugin, 'skills/plan-product/agents');
  mkdirSync(retiredSkillAgentsDir, { recursive: true });
  writeFileSync(path.join(retiredSkillAgentsDir, 'openai.yaml'), 'interface:\n  display_name: Legacy\n', 'utf8');
  expectValidationFailure(/Retired 'skills\/plan-product\/agents\/' directory detected/);
  rmSync(retiredSkillAgentsDir, { recursive: true, force: true });

  const retiredCodexUiDir = path.join(tempPlugin, 'harness-adapters/codex');
  mkdirSync(retiredCodexUiDir, { recursive: true });
  writeFileSync(path.join(retiredCodexUiDir, 'openai.yaml'), 'interface:\n  display_name: Legacy\n', 'utf8');
  expectValidationFailure(/Retired dead Codex UI file 'harness-adapters\/codex\/openai\.yaml'/);
  rmSync(retiredCodexUiDir, { recursive: true, force: true });
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));

  // 6. Machine-local path leaks & retired runtime tokens across skills/, commands/, src/, scripts/, harness-adapters/
  const hermesShimPath = path.join(tempPlugin, 'harness-adapters/hermes/plugin.py');
  const validHermesShim = readFileSync(hermesShimPath, 'utf8');
  const leakCases = [
    [['', 'srv', 'repos', 'NyssaAI', 'product-planning'].join('/'), /leaked machine-local workspace path/],
    [['', 'root', '.gemini', 'antigravity-cli', 'brain', 'abc'].join('/'), /leaked machine-local Antigravity path/],
    [['C:', 'Users', 'alice', 'repo'].join('\\'), /leaked machine-local Windows path/],
    [['NYSSA', 'PLUGIN', 'STATE', 'DIR'].join('_'), /retired runtime environment variable/],
    ['${' + ['PLUGIN', 'DATA'].join('_') + '}', /retired runtime token/],
    [['settings', 'schema', 'json'].join('.'), /retired schema filename/],
  ];
  for (const [leakedToken, expectedRegex] of leakCases) {
    writeFileSync(hermesShimPath, `${validHermesShim}\n# ${leakedToken}\n`, 'utf8');
    expectValidationFailure(expectedRegex);
  }
  writeFileSync(hermesShimPath, validHermesShim, 'utf8');

  const retiredSchemaFile = path.join(
    tempPlugin,
    'skills/plan-product/assets',
    ['settings', 'schema', 'json'].join('.')
  );
  writeFileSync(retiredSchemaFile, '{}\n', 'utf8');
  expectValidationFailure(/Disallowed retired schema file/);
  rmSync(retiredSchemaFile);
  assert.doesNotThrow(() => validate(tempPlugin, { validatePlugin: true, userHome: null }));
});
