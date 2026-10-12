import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCodeMapConfig } from '../code-map/lib/code-map-config.mjs';
import { sourceInventory, SOURCE_SCAN_SKIP_DIRS } from '../code-map/lib/source-files.mjs';
import { loadPlanProductConfig } from '../module-map/lib/config.mjs';
import { tsConfigInputs } from '../module-map/lib/adapters/typescript.mjs';
import { resolveRepoContainedPath } from './repo-paths.mjs';
import { writeArtifactIfChanged } from './write-artifact.mjs';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STATE_VERSION = 1;
const RESOLVER_INPUT = /^(?:package\.json|(?:ts|js)config(?:\.[^.]+)*\.json|go\.(?:mod|work)|pyproject\.toml|setup\.(?:py|cfg)|Cargo\.toml|(?:pnpm-workspace|lerna)\.(?:yaml|json)|Directory\.(?:Build|Packages)\.(?:props|targets)|.+\.(?:csproj|sln|slnx))$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function slash(value) {
  return value.replace(/\\/g, '/');
}

function walkFiles(root, relative = '') {
  const dir = path.join(root, relative);
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SOURCE_SCAN_SKIP_DIRS.has(entry.name) || entry.name === '.temp') continue;
    const rel = slash(path.join(relative, entry.name));
    if (entry.isDirectory()) files.push(...walkFiles(root, rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

function fileHashes(root, files) {
  return [...new Set(files)].sort().map((rel) => {
    const full = resolveRepoContainedPath(root, rel, 'scan input');
    return [slash(rel), existsSync(full) ? sha256(readFileSync(full)) : null];
  });
}

function statePath(repoRoot) {
  return path.join(repoRoot, loadPlanProductConfig(repoRoot).outputDir, 'scan-state.json');
}

/** Capture content, inventory, configuration, resolver metadata and generator identity. */
export function captureMapInputs(repoRoot, { pluginRoot = PLUGIN_ROOT } = {}) {
  const codeConfig = loadCodeMapConfig(repoRoot);
  const moduleConfig = loadPlanProductConfig(repoRoot);
  const inventory = sourceInventory(repoRoot, codeConfig);
  const sourceFiles = [...inventory.files, ...inventory.unsupportedFiles, ...inventory.disabledFiles];
  const metadata = walkFiles(repoRoot).filter((rel) => RESOLVER_INPUT.test(path.posix.basename(rel)));
  const inputs = fileHashes(repoRoot, [
    ...sourceFiles,
    ...metadata,
    'plan-product.config.json',
    '.plan-product/config.json',
    ...Object.values(moduleConfig.docs).flat(),
    ...(moduleConfig.nav ? [moduleConfig.nav] : []),
  ]);
  const generators = fileHashes(pluginRoot, [
    'package.json',
    ...walkFiles(pluginRoot, 'scripts').filter((rel) => !rel.endsWith('.test.mjs')),
  ]);
  // The adapter can read an inherited config outside the repository. Hash those
  // exact files without persisting their paths or contents in the scan state.
  const inheritedConfigs = tsConfigInputs(repoRoot).map((file) => [
    slash(path.relative(repoRoot, file)), sha256(readFileSync(file)),
  ]);
  return {
    fingerprint: sha256(JSON.stringify({ roots: codeConfig.roots, languages: codeConfig.languages, inputs, inheritedConfigs, generators })),
    sourceFileCount: inventory.files.length,
  };
}

/** Invalidate the previous success before either generator can write partial outputs. */
export function beginMapScan(repoRoot, options) {
  const snapshot = captureMapInputs(repoRoot, options);
  const state = statePath(repoRoot);
  if (existsSync(state)) unlinkSync(state);
  return snapshot;
}

function coreArtifactPaths(repoRoot) {
  const codeConfig = loadCodeMapConfig(repoRoot);
  const config = loadPlanProductConfig(repoRoot);
  const modulePath = slash(path.join(config.outputDir, 'module-map.json'));
  const moduleMap = JSON.parse(readFileSync(path.join(repoRoot, modulePath), 'utf8'));
  return [
    codeConfig.output,
    modulePath,
    slash(path.join(config.outputDir, 'index.md')),
    ...(moduleMap.modules ?? []).map((mod) => mod.planningModule).filter(Boolean),
  ];
}

/** Call only after both core generators succeed. Optional reports have separate lifecycles. */
export function completeMapScan(repoRoot, before, options) {
  const after = captureMapInputs(repoRoot, options);
  if (before.fingerprint !== after.fingerprint) {
    throw new Error('Map inputs changed during generation; run map-code again before relying on the maps.');
  }
  const artifacts = fileHashes(repoRoot, coreArtifactPaths(repoRoot));
  const missing = artifacts.filter(([, digest]) => digest === null).map(([rel]) => rel);
  if (missing.length) throw new Error(`Map generation did not produce required artifacts: ${missing.join(', ')}`);
  const state = { schemaVersion: STATE_VERSION, ...after, artifacts };
  writeArtifactIfChanged(statePath(repoRoot), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

/** Shared freshness result for the CLI, doctor and regeneration hooks. */
export function checkMapFreshness(repoRoot, options) {
  try {
    const file = statePath(repoRoot);
    if (!existsSync(file)) return { fresh: false, reason: 'No completed map-code scan is recorded.' };
    const state = JSON.parse(readFileSync(file, 'utf8'));
    if (state.schemaVersion !== STATE_VERSION) return { fresh: false, reason: 'Map scan-state format changed.' };
    const current = captureMapInputs(repoRoot, options);
    if (state.fingerprint !== current.fingerprint) {
      return { fresh: false, reason: 'Source inventory, contents, configuration, or generator changed.' };
    }
    const artifacts = fileHashes(repoRoot, coreArtifactPaths(repoRoot));
    if (JSON.stringify(artifacts) !== JSON.stringify(state.artifacts) || artifacts.some(([, digest]) => digest === null)) {
      return { fresh: false, reason: 'A core map artifact is missing or changed.' };
    }
    return { fresh: true, reason: 'Core maps match the completed content scan.', sourceFileCount: current.sourceFileCount };
  } catch (error) {
    return { fresh: false, reason: `Could not verify map freshness: ${error instanceof Error ? error.message : String(error)}` };
  }
}
