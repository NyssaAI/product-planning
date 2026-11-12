// Responsibility: Seed and repair repo_root planning configuration, schema, starter templates, and core overview documents non-destructively.
// Public interface:
// `-- initialize(repoRoot, options)

import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRepoContainedPath } from './repo-paths.mjs';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function fillMissing(existing, defaults, label = 'config') {
  if (!isObject(existing)) throw new Error(`${label} must be an object`);
  const result = { ...existing };
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in result)) result[key] = structuredClone(value);
    else if (isObject(value)) result[key] = fillMissing(result[key], value, `${label}.${key}`);
    else if (typeof value === 'string' && (typeof result[key] !== 'string' || !result[key].trim())) {
      throw new Error(`${label}.${key} must be a non-empty string`);
    }
  }
  return result;
}

function relativePath(repoRoot, value, label) {
  if (typeof value !== 'string' || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error(`${label} must be repo-relative`);
  }
  return resolveRepoContainedPath(repoRoot, value.replaceAll('\\', '/'), label);
}

/**
 * Create missing planning assets in repo_root while preserving existing documents and custom templates.
 */
export function initialize(repoRoot = process.cwd(), options = {}) {
  repoRoot = path.resolve(repoRoot);
  const pluginRoot = options.pluginRoot ? path.resolve(options.pluginRoot) : PLUGIN_ROOT;
  const userHome = options.userHome === null
    ? null
    : path.resolve(options.userHome ?? os.homedir());

  const legacyConfigFile = path.join(repoRoot, '.plan-product/config.json');
  if (existsSync(legacyConfigFile)) {
    throw new Error('Legacy Model v1 or .plan-product/ state detected. Run "node <plugin_root>/src/migration/migrate.mjs" to upgrade to Model v2 (.nyssa-ai/plan-product/).');
  }
  if (existsSync(path.join(repoRoot, 'docs/roadmap.md'))) {
    throw new Error('Legacy docs/roadmap.md detected. Run "node <plugin_root>/src/migration/migrate.mjs" to migrate to docs/plans/development-plan.md (DP-pp.ss).');
  }

  const bundledDefaults = readJson(path.join(pluginRoot, 'skills/plan-product/assets/config.json'));
  const userConfigFile = userHome ? path.join(userHome, '.nyssa-ai/plan-product/config.json') : null;
  const userDefaults = userConfigFile && existsSync(userConfigFile)
    ? fillMissing(readJson(userConfigFile), bundledDefaults, 'user_home.config')
    : bundledDefaults;

  const configFile = relativePath(repoRoot, '.nyssa-ai/plan-product/config.json', 'config');
  const original = existsSync(configFile) ? readJson(configFile) : {};
  if (isObject(original) && (original.paths?.roadmap !== undefined || original.structure?.roadmap !== undefined)) {
    throw new Error('Legacy roadmap configuration detected. Run "node <plugin_root>/src/migration/migrate.mjs" to upgrade to developmentPlan (docs/plans/development-plan.md, DP-pp.ss).');
  }

  // Seed missing repo_root fields from user_home (#1) merged over bundled plugin_root defaults.
  const config = fillMissing(original, userDefaults);
  if (config.version === 1) throw new Error('Planning config version 1 is legacy. Run "node <plugin_root>/src/migration/migrate.mjs" to upgrade to version 2.');
  if (config.version !== 2) throw new Error('Unsupported planning config version');

  // Resolve aliases only when one side was omitted, never rewriting explicit values.
  for (const [section, key, field] of [
    ['features', 'inventory', 'features'],
    ['features', 'root', 'featureDocs'],
    ['concepts', 'root', 'concepts'],
    ['developmentPlan', 'file', 'developmentPlan'],
  ]) {
    if (original.structure?.[section]?.[key] === undefined) config.structure[section][key] = config.paths[field];
    else if (original.paths?.[field] === undefined) config.paths[field] = config.structure[section][key];
  }
  const featureDefaults = config.structure.features;
  if (original.structure?.features?.featurePathPattern === undefined) {
    featureDefaults.featurePathPattern = `${featureDefaults.root}/${featureDefaults.folderPattern}/${featureDefaults.featureFile}`;
  }
  if (original.structure?.features?.useCasePathPattern === undefined) {
    featureDefaults.useCasePathPattern = `${featureDefaults.root}/${featureDefaults.folderPattern}/${featureDefaults.useCaseFilePattern}`;
  }
  const conceptDefaults = config.structure.concepts;
  if (original.structure?.concepts?.pathPattern === undefined) {
    conceptDefaults.pathPattern = `${conceptDefaults.root}/${conceptDefaults.filePattern}`;
  }

  // Validate all configured paths before the first write (including symlink/junction containment).
  for (const [name, value] of Object.entries(config.paths)) relativePath(repoRoot, value, `paths.${name}`);
  if (config.paths.repoRoot !== '.') throw new Error('paths.repoRoot must be .');
  for (const [section, keys] of Object.entries({
    features: ['inventory', 'root', 'featurePathPattern', 'useCasePathPattern'],
    concepts: ['root', 'pathPattern'],
    developmentPlan: ['file'],
  })) {
    for (const key of keys) relativePath(repoRoot, config.structure[section][key], `structure.${section}.${key}`);
  }
  for (const [section, key] of [
    ['features', 'folderPattern'],
    ['features', 'featureFile'],
    ['features', 'useCaseFilePattern'],
    ['concepts', 'filePattern'],
  ]) {
    const val = config.structure?.[section]?.[key];
    if (typeof val !== 'string' || !val.trim() || val.includes('..') || val.includes('/') || val.includes('\\') || val.includes(':')) {
      throw new Error(`structure.${section}.${key} must be a single path segment without traversal or separators`);
    }
  }

  const assets = [['configSchema', 'schema.json']];
  for (const name of ['glossary', 'product', 'features', 'techStack', 'feature', 'useCase', 'concept', 'developmentPlan']) {
    const filename = { techStack: 'tech-stack', useCase: 'use-case', developmentPlan: 'development-plan' }[name] || name;
    assets.push([`${name}Template`, `templates/${filename}.md`]);
  }
  const writes = new Map();
  const schedule = (target, content) => {
    const key = process.platform === 'win32' ? target.toLowerCase() : target;
    if (existsSync(target) && !statSync(target).isFile()) throw new Error(`Planning output must be a file: ${target}`);
    for (const other of writes.keys()) {
      if (key === other || key.startsWith(other + path.sep) || other.startsWith(key + path.sep)) {
        throw new Error(`Planning output paths collide: ${target}`);
      }
    }
    writes.set(key, { target, content });
  };
  schedule(configFile, JSON.stringify(config, null, 2) + '\n');
  for (const [key, source] of assets) {
    const target = relativePath(repoRoot, config.paths[key], `paths.${key}`);
    const content = readFileSync(path.join(pluginRoot, 'skills/plan-product/assets', source), 'utf8');
    schedule(target, content);
  }
  for (const name of ['glossary', 'product', 'features', 'techStack']) {
    const template = relativePath(repoRoot, config.paths[`${name}Template`], `paths.${name}Template`);
    const pending = [...writes.values()].find(row => row.target === template);
    const content = existsSync(template) ? readFileSync(template, 'utf8') : pending.content;
    schedule(relativePath(repoRoot, config.paths[name], `paths.${name}`), content);
  }
  const result = { created: [], updated: [], preserved: [] };
  for (const { target } of writes.values()) {
    let ancestor = path.dirname(target);
    while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
    if (!statSync(ancestor).isDirectory()) throw new Error(`Planning output parent must be a directory: ${ancestor}`);
  }
  for (const { target, content } of writes.values()) {
    const relative = path.relative(repoRoot, target).replaceAll('\\', '/');
    if (existsSync(target)) {
      if (target === configFile && JSON.stringify(original) !== JSON.stringify(config)) {
        writeFileSync(target, content);
        result.updated.push(relative);
      } else {
        result.preserved.push(relative);
      }
    } else {
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content, { flag: 'wx' });
      result.created.push(relative);
    }
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node <plugin_root>/src/init/init.mjs [--repo-root <repo_root> | <repo_root>]\nRun from repo_root or pass --repo-root. Creates missing planning config, schema, starter templates (including glossary.md and development-plan.md), and core documents in .nyssa-ai/plan-product/ and docs/. Existing content is preserved.');
  } else {
    let targetRepo = null;
    let invalidArgs = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--repo-root' && i + 1 < args.length) {
        targetRepo = args[++i];
      } else if (!args[i].startsWith('-') && targetRepo === null) {
        targetRepo = args[i];
      } else {
        invalidArgs = true;
      }
    }
    if (invalidArgs) {
      console.error('Unknown arguments. Use --help.');
      process.exitCode = 1;
    } else {
      try {
        console.log(JSON.stringify(initialize(targetRepo || process.cwd()), null, 2));
      } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
      }
    }
  }
}
