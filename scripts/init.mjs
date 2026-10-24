import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRepoContainedPath } from './lib/repo-paths.mjs';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function fillMissing(existing, defaults, label = 'config') {
  if (!isObject(existing)) throw new Error(`${label} must be an object`);
  const result = { ...existing };
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in result)) result[key] = structuredClone(value);
    else if (isObject(value)) result[key] = fillMissing(result[key], value, `${label}.${key}`);
    else if (typeof value === 'string' && (typeof result[key] !== 'string' || !result[key].trim())) throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return result;
}

function relativePath(root, value, label) {
  if (typeof value !== 'string' || path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error(`${label} must be repo-relative`);
  }
  return resolveRepoContainedPath(root, value.replaceAll('\\', '/'), label);
}

/** Create missing planning assets, preserving all existing documents and templates. */
export function initialize(root = process.cwd()) {
  root = path.resolve(root);

  const legacyConfigFile = path.join(root, '.plan-product/config.json');
  if (existsSync(legacyConfigFile)) {
    throw new Error('Legacy Model v1 or .plan-product/ state detected. Run "node scripts/migrate.mjs" to upgrade to Model v2 (.nyssa-ai/plan-product/).');
  }

  const defaults = readJson(path.join(bundle, 'skills/plan-product/assets/config.json'));
  const configFile = relativePath(root, '.nyssa-ai/plan-product/config.json', 'config');
  const original = existsSync(configFile) ? readJson(configFile) : {};
  const config = fillMissing(original, defaults);
  if (config.version === 1) throw new Error('Planning config version 1 is legacy. Run "node scripts/migrate.mjs" to upgrade to version 2.');
  if (config.version !== 2) throw new Error('Unsupported planning config version');

  // Resolve aliases only when one side was omitted, never rewrite explicit values.
  for (const [section, key, field] of [['features','inventory','features'], ['features','root','featureDocs'], ['concepts','root','concepts'], ['roadmap','file','roadmap']]) {
    if (original.structure?.[section]?.[key] === undefined) config.structure[section][key] = config.paths[field];
    else if (original.paths?.[field] === undefined) config.paths[field] = config.structure[section][key];
  }
  const featureDefaults = config.structure.features;
  if (original.structure?.features?.featurePathPattern === undefined) featureDefaults.featurePathPattern = `${featureDefaults.root}/${featureDefaults.folderPattern}/${featureDefaults.featureFile}`;
  if (original.structure?.features?.useCasePathPattern === undefined) featureDefaults.useCasePathPattern = `${featureDefaults.root}/${featureDefaults.folderPattern}/${featureDefaults.useCaseFilePattern}`;
  const conceptDefaults = config.structure.concepts;
  if (original.structure?.concepts?.pathPattern === undefined) conceptDefaults.pathPattern = `${conceptDefaults.root}/${conceptDefaults.filePattern}`;

  // Resolve everything before the first write. This also checks existing junctions.
  for (const [name, value] of Object.entries(config.paths)) relativePath(root, value, `paths.${name}`);
  if (config.paths.repoRoot !== '.') throw new Error('paths.repoRoot must be .');
  for (const [section, keys] of Object.entries({ features: ['inventory','root','featurePathPattern','useCasePathPattern'], concepts: ['root','pathPattern'], roadmap: ['file'] })) {
    for (const key of keys) relativePath(root, config.structure[section][key], `structure.${section}.${key}`);
  }
  for (const [section, key] of [['features', 'folderPattern'], ['features', 'featureFile'], ['features', 'useCaseFilePattern'], ['concepts', 'filePattern']]) {
    const val = config.structure?.[section]?.[key];
    if (typeof val !== 'string' || !val.trim() || val.includes('..') || val.includes('/') || val.includes('\\') || val.includes(':')) {
      throw new Error(`structure.${section}.${key} must be a single path segment without traversal or separators`);
    }
  }
  const assets = [['configSchema', 'schema.json']];
  for (const name of ['product', 'features', 'techStack', 'feature', 'useCase', 'concept', 'roadmap']) {
    const filename = { techStack: 'tech-stack', useCase: 'use-case' }[name] || name;
    assets.push([`${name}Template`, `templates/${filename}.md`]);
  }
  const writes = new Map();
  const schedule = (target, content) => {
    const key = process.platform === 'win32' ? target.toLowerCase() : target;
    if (existsSync(target) && !statSync(target).isFile()) throw new Error(`Planning output must be a file: ${target}`);
    for (const other of writes.keys()) {
      if (key === other || key.startsWith(other + path.sep) || other.startsWith(key + path.sep)) throw new Error(`Planning output paths collide: ${target}`);
    }
    writes.set(key, { target, content });
  };
  schedule(configFile, JSON.stringify(config, null, 2) + '\n');
  for (const [key, source] of assets) {
    const target = relativePath(root, config.paths[key], `paths.${key}`);
    const content = readFileSync(path.join(bundle, 'skills/plan-product/assets', source), 'utf8');
    schedule(target, content);
  }
  for (const name of ['product', 'features', 'techStack']) {
    const template = relativePath(root, config.paths[`${name}Template`], `paths.${name}Template`);
    const pending = [...writes.values()].find(row => row.target === template);
    const content = existsSync(template) ? readFileSync(template, 'utf8') : pending.content;
    schedule(relativePath(root, config.paths[name], `paths.${name}`), content);
  }
  const result = { created: [], updated: [], preserved: [] };
  for (const { target } of writes.values()) {
    let ancestor = path.dirname(target);
    while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
    if (!statSync(ancestor).isDirectory()) throw new Error(`Planning output parent must be a directory: ${ancestor}`);
  }
  for (const { target, content } of writes.values()) {
    const relative = path.relative(root, target).replaceAll('\\', '/');
    if (existsSync(target)) {
      if (target === configFile && JSON.stringify(original) !== JSON.stringify(config)) {
        writeFileSync(target, content);
        result.updated.push(relative);
      } else result.preserved.push(relative);
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
    console.log('Usage: node <plugin-root>/scripts/init.mjs\nRun from the target repository root. Creates missing planning config, schema, templates, and core documents in .nyssa-ai/plan-product/. Existing content is preserved.');
  } else if (args.length) {
    console.error('Unknown arguments. Use --help.');
    process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(initialize(), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
