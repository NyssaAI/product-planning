// Responsibility: Project canonical plugin.json metadata into synchronized harness-adapter manifests and staged host bundles.
// Public interface:
// `-- assemble(mode, options)

import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_SCHEMA_V1 = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const ANTIGRAVITY_PLUGIN_SCHEMA_V1 = 'https://antigravity.google/schemas/v1/plugin.json';
const IGNORED_BUNDLE_NAMES = new Set([
  '.DS_Store',
  '__pycache__',
  '.nyssa-ai',
  '.nyssaai',
  '.nyssa',
  '.temp',
  'node_modules',
]);
const HOST_INTERFACE = {
  displayName: 'plan-product',
  shortDescription: 'Plan products, concepts, features, use cases, and development plans.',
  longDescription: 'Define products, Ubiquitous Language glossaries, domain concepts, features, use cases, and dependency-ordered development plans through guided conversations.',
  developerName: 'NyssaAI',
  category: 'Software engineering',
  capabilities: ['Interactive', 'Read', 'Write'],
  defaultPrompt: [
    'Plan this product',
    'Define a domain concept',
    'Plan a feature',
    'Document a use case',
    'Sequence the development plan',
    'Update the product',
    'Update the development plan',
    'Upgrade planning docs to v2',
  ],
  brandColor: '#2563EB',
};

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function normalizeCrlfBytes(buf) {
  if (!buf.includes(0x0d)) return buf;
  const out = [];
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) continue;
    out.push(buf[i]);
  }
  return Buffer.from(out);
}

function resolveWithRealAncestors(targetPath) {
  const absolute = path.resolve(targetPath);
  const trailingSegments = [];
  let cursor = absolute;
  while (!existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    trailingSegments.unshift(path.basename(cursor));
    cursor = parent;
  }
  const realBase = existsSync(cursor) ? realpathSync(cursor) : cursor;
  return trailingSegments.length > 0 ? path.join(realBase, ...trailingSegments) : realBase;
}

function isWithinDirectory(candidatePath, parentDir) {
  const rel = path.relative(parentDir, candidatePath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function validateOutputDir(rawOutputDir, targetRoot) {
  if (typeof rawOutputDir !== 'string' || rawOutputDir.trim() === '') {
    throw new Error('--output-dir must be a non-empty directory path');
  }
  const trimmed = rawOutputDir.replace(/[\\/]+$/, '') || rawOutputDir;
  const lexicalOut = path.resolve(rawOutputDir);
  if (
    lstatSync(trimmed, { throwIfNoEntry: false })?.isSymbolicLink() ||
    lstatSync(lexicalOut, { throwIfNoEntry: false })?.isSymbolicLink() ||
    lstatSync(path.dirname(lexicalOut), { throwIfNoEntry: false })?.isSymbolicLink()
  ) {
    throw new Error(`Unsafe symlink output directory: ${rawOutputDir}`);
  }
  const resolvedOut = resolveWithRealAncestors(lexicalOut);
  const resolvedRoot = realpathSync(targetRoot);
  const resolvedTemp = resolveWithRealAncestors(path.join(targetRoot, '.temp'));
  if (resolvedOut === resolvedRoot) {
    throw new Error(`Refusing to stage distribution bundles directly into repo_root: ${rawOutputDir}`);
  }
  if (isWithinDirectory(resolvedOut, resolvedRoot) && !isWithinDirectory(resolvedOut, resolvedTemp)) {
    throw new Error(
      `Inside repo_root, distribution bundles may only be staged under .temp/: ${rawOutputDir}`
    );
  }
  return resolvedOut;
}

function commandNameForWorkflow(workflowName) {
  return workflowName === 'development-plan'
    ? 'commands/plan-development.md'
    : `commands/plan-${workflowName}.md`;
}

function collectTreeFiles(rootDir, relDir) {
  const files = {};
  function walk(currentRel) {
    const fullDir = path.join(rootDir, currentRel);
    const entries = readdirSync(fullDir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
    for (const entry of entries) {
      if (IGNORED_BUNDLE_NAMES.has(entry.name)) continue;
      const entryRel = `${currentRel}/${entry.name}`;
      const entryFull = path.join(fullDir, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Refusing to bundle symbolic link: ${entryRel}`);
      }
      if (entry.isDirectory()) {
        walk(entryRel);
      } else if (entry.isFile()) {
        files[entryRel] = readFileSync(entryFull);
      }
    }
  }
  walk(relDir);
  return files;
}

function listExistingBundleFiles(bundleDir, { cleanTransientCaches = false } = {}) {
  const existing = [];
  function walk(currentDir, prefix) {
    const entries = readdirSync(currentDir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(currentDir, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Unsafe symbolic link inside staged bundle: ${full}`);
      }
      if (entry.name === '__pycache__' || entry.name === '.DS_Store') {
        if (cleanTransientCaches) {
          rmSync(full, { recursive: true, force: true });
        }
        continue;
      }
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.isFile()) {
        existing.push(rel);
      }
    }
  }
  walk(bundleDir, '');
  return existing;
}

function convertCommandToSkill(cmdStem, rawBuffer, pluginName) {
  const text = rawBuffer.toString('utf8').replaceAll('\r\n', '\n');
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`commands/${cmdStem}.md is missing YAML frontmatter`);
  }
  const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
  if (!descMatch) {
    throw new Error(`commands/${cmdStem}.md frontmatter is missing description`);
  }
  let desc = descMatch[1].trim();
  if (
    (desc.startsWith('"') && desc.endsWith('"')) ||
    (desc.startsWith("'") && desc.endsWith("'"))
  ) {
    desc = desc.slice(1, -1);
  }
  const needsQuotes = /:\s|#|^[\s"'{[>|*&!%@`?-]/.test(desc);
  const formattedDesc = needsQuotes ? JSON.stringify(desc) : desc;
  const skillName = `${pluginName}-cmd-${cmdStem}`;
  const body = fmMatch[2].replace(/^\n+/, '');
  return Buffer.from(`---\nname: ${skillName}\ndescription: ${formattedDesc}\n---\n\n${body}`, 'utf8');
}

function attachAssemblyManifest(bundleFormat, version, files) {
  const digest = createHash('sha256');
  const sortedKeys = Object.keys(files).sort();
  for (const key of sortedKeys) {
    digest.update(Buffer.from(key, 'utf8'));
    digest.update(Buffer.from([0]));
    digest.update(normalizeCrlfBytes(files[key]));
    digest.update(Buffer.from([0]));
  }
  return {
    ...files,
    'assembly.json': encodeJson({
      format: bundleFormat,
      source: 'scripts/assemble.mjs',
      source_sha256: digest.digest('hex'),
      version,
    }),
  };
}

function buildStagedBundles(targetRoot, canonical, rootManifestBuffers) {
  const hermesShimPath = path.join(targetRoot, 'harness-adapters/hermes/plugin.py');
  if (!existsSync(hermesShimPath)) {
    throw new Error('Missing mandatory Hermes harness adapter: harness-adapters/hermes/plugin.py');
  }
  const licensePath = path.join(targetRoot, 'LICENSE');
  if (!existsSync(licensePath)) {
    throw new Error('Missing mandatory LICENSE at plugin root');
  }
  const packageJsonPath = path.join(targetRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('Missing mandatory package.json at plugin root');
  }

  const skillsFiles = collectTreeFiles(targetRoot, 'skills');
  const commandsFiles = collectTreeFiles(targetRoot, 'commands');
  const srcFiles = collectTreeFiles(targetRoot, 'src');

  const portableFiles = attachAssemblyManifest('portable-plugin', canonical.version, {
    'plugin.json': readFileSync(path.join(targetRoot, 'plugin.json')),
    LICENSE: readFileSync(licensePath),
    'package.json': readFileSync(packageJsonPath),
    ...rootManifestBuffers,
    ...skillsFiles,
    ...commandsFiles,
    ...srcFiles,
  });

  const convertedCommandSkills = {};
  for (const [cmdRel, cmdBytes] of Object.entries(commandsFiles)) {
    if (!cmdRel.endsWith('.md')) continue;
    const cmdStem = path.basename(cmdRel, '.md');
    const skillRel = `skills/${canonical.name}-cmd-${cmdStem}/SKILL.md`;
    convertedCommandSkills[skillRel] = convertCommandToSkill(cmdStem, cmdBytes, canonical.name);
  }

  const antigravityManifest = {
    $schema: ANTIGRAVITY_PLUGIN_SCHEMA_V1,
    name: canonical.name,
    version: canonical.version,
    description: canonical.description,
    author: canonical.author,
    homepage: canonical.homepage,
    repository: canonical.repository,
  };
  const antigravityFiles = attachAssemblyManifest('antigravity-plugin', canonical.version, {
    'plugin.json': encodeJson(antigravityManifest),
    ...skillsFiles,
    ...convertedCommandSkills,
    ...srcFiles,
  });

  const hermesYaml =
    [
      `name: ${JSON.stringify(canonical.name)}`,
      `version: ${JSON.stringify(canonical.version)}`,
      `description: ${JSON.stringify(canonical.description)}`,
    ].join('\n') + '\n';
  const hermesFiles = attachAssemblyManifest('hermes-plugin', canonical.version, {
    'plugin.yaml': Buffer.from(hermesYaml, 'utf8'),
    '__init__.py': readFileSync(hermesShimPath),
    ...skillsFiles,
    ...srcFiles,
  });

  return {
    portable: { format: 'portable-plugin', files: portableFiles },
    antigravity: { format: 'antigravity-plugin', files: antigravityFiles },
    hermes: { format: 'hermes-plugin', files: hermesFiles },
  };
}

export function assemble(mode = 'check', options = {}) {
  if (mode !== 'write' && mode !== 'check') {
    throw new Error(`Unsupported assemble mode "${mode}". Expected "write" or "check".`);
  }
  const targetRoot = options.repoRoot ? path.resolve(options.repoRoot) : defaultRepoRoot;
  const explicitOutputDir = options.outputDir !== undefined && options.outputDir !== null;
  const rawOutputDir = explicitOutputDir
    ? String(options.outputDir)
    : path.join(targetRoot, '.temp/dist');
  const outputDir = validateOutputDir(rawOutputDir, targetRoot);

  const readRootJson = rel => JSON.parse(readFileSync(path.join(targetRoot, rel), 'utf8'));
  const canonical = readRootJson('plugin.json');
  if (canonical.$schema !== PLUGIN_SCHEMA_V1) {
    throw new Error(`plugin.json $schema must equal ${PLUGIN_SCHEMA_V1}`);
  }
  if (typeof canonical.homepage !== 'string' || !canonical.homepage) {
    throw new Error('plugin.json homepage must be a non-empty string');
  }
  if (typeof canonical.repository !== 'string' || !canonical.repository) {
    throw new Error('plugin.json repository must be a non-empty string');
  }
  if (!existsSync(path.join(targetRoot, 'skills/plan-product/SKILL.md'))) {
    throw new Error('Missing canonical facade skill: skills/plan-product/SKILL.md');
  }
  const commandFiles = readdirSync(path.join(targetRoot, 'commands'))
    .filter(f => f.endsWith('.md'))
    .map(f => `commands/${f}`)
    .sort();
  const workflowFiles = readdirSync(path.join(targetRoot, 'skills/plan-product/workflows'))
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort();
  const expectedCommands = workflowFiles.map(commandNameForWorkflow).sort();
  if (JSON.stringify(commandFiles) !== JSON.stringify(expectedCommands)) {
    throw new Error(
      `commands/ (${commandFiles.join(', ')}) does not match skills/plan-product/workflows/ (${expectedCommands.join(', ')})`
    );
  }

  const ui = canonical.interface || HOST_INTERFACE;
  const harnessAdapters = [
    {
      file: '.claude-plugin/plugin.json',
      generate: () => ({
        name: canonical.name,
        version: canonical.version,
        description: canonical.description,
        author: canonical.author,
        homepage: canonical.homepage,
        repository: canonical.repository,
        license: canonical.license,
        keywords: canonical.keywords,
      }),
    },
    {
      file: '.codex-plugin/plugin.json',
      generate: () => ({
        name: canonical.name,
        version: canonical.version,
        description: canonical.description,
        author: canonical.author,
        homepage: canonical.homepage,
        repository: canonical.repository,
        license: canonical.license,
        keywords: canonical.keywords,
        skills: './skills/',
        interface: {
          displayName: ui.displayName || canonical.name,
          shortDescription: ui.shortDescription || canonical.description,
          longDescription: ui.longDescription || canonical.description,
          developerName: canonical.author?.name || ui.developerName || 'NyssaAI',
          category: ui.category || 'Productivity',
          capabilities: ui.capabilities || ['Interactive', 'Read', 'Write'],
          websiteURL: canonical.homepage,
          defaultPrompt: ui.defaultPrompt || [],
          brandColor: ui.brandColor || '#2563EB',
          screenshots: [],
        },
      }),
    },
    {
      file: '.cursor-plugin/plugin.json',
      generate: () => ({
        name: canonical.name,
        displayName: ui.displayName || canonical.name,
        description: canonical.description,
        version: canonical.version,
        author: canonical.author,
        homepage: canonical.homepage,
        repository: canonical.repository,
        license: canonical.license,
        keywords: canonical.keywords,
        skills: './skills/',
        commands: './commands/',
      }),
    },
    {
      file: '.tessl-plugin/plugin.json',
      generate: () => ({
        name: `nyssa-ai/${canonical.name}`,
        version: canonical.version,
        description: canonical.description,
        private: true,
        skills: './skills',
      }),
    },
    {
      file: 'gemini-extension.json',
      generate: () => ({
        name: canonical.name,
        version: canonical.version,
        description: canonical.description,
      }),
    },
  ];

  const rootManifestBuffers = {};
  let drifted = false;
  for (const { file, generate } of harnessAdapters) {
    const generated = generate();
    const contentBytes = encodeJson(generated);
    rootManifestBuffers[file] = contentBytes;
    const targetPath = path.join(targetRoot, file);
    if (lstatSync(targetPath, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`Unsafe symbolic link at manifest path: ${file}`);
    }
    if (mode === 'write') {
      const existingBytes = existsSync(targetPath) ? readFileSync(targetPath) : null;
      if (!existingBytes || !existingBytes.equals(contentBytes)) {
        mkdirSync(path.dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, contentBytes);
        console.log(`Updated ${file}`);
      }
    } else {
      const existing = existsSync(targetPath) ? readRootJson(file) : null;
      if (JSON.stringify(existing) !== JSON.stringify(generated)) {
        console.error(
          `Drift in ${file}: harness-adapter manifest does not match canonical projection from plugin.json`
        );
        drifted = true;
      }
    }
  }

  const bundles = buildStagedBundles(targetRoot, canonical, rootManifestBuffers);
  const shouldProcessBundles =
    mode === 'write' ||
    explicitOutputDir ||
    Object.keys(bundles).some(name => existsSync(path.join(outputDir, name)));

  if (shouldProcessBundles) {
    for (const [bundleName, { format: bundleFormat, files }] of Object.entries(bundles)) {
      const bundleDest = path.join(outputDir, bundleName);
      if (lstatSync(bundleDest, { throwIfNoEntry: false })?.isSymbolicLink()) {
        throw new Error(`Unsafe symlink bundle destination: ${bundleDest}`);
      }
      if (existsSync(bundleDest)) {
        const markerPath = path.join(bundleDest, 'assembly.json');
        let marker = null;
        if (existsSync(markerPath)) {
          try {
            marker = JSON.parse(readFileSync(markerPath, 'utf8'));
          } catch {
            marker = null;
          }
        }
        if (!marker || marker.format !== bundleFormat) {
          throw new Error(`Unowned bundle destination: ${bundleDest}`);
        }
      }

      if (mode === 'write') {
        if (existsSync(bundleDest)) {
          const existingFiles = listExistingBundleFiles(bundleDest, {
            cleanTransientCaches: true,
          });
          for (const rel of existingFiles) {
            if (!(rel in files)) {
              rmSync(path.join(bundleDest, rel), { force: true });
            }
          }
        }
        for (const [rel, contentBytes] of Object.entries(files)) {
          const outPath = path.join(bundleDest, rel);
          mkdirSync(path.dirname(outPath), { recursive: true });
          writeFileSync(outPath, contentBytes);
        }
        console.log(`Staged ${bundleName} bundle -> ${bundleDest}`);
      } else {
        if (!existsSync(bundleDest)) {
          console.error(`Missing staged bundle: ${bundleName} under ${outputDir}`);
          drifted = true;
          continue;
        }
        const existingFiles = listExistingBundleFiles(bundleDest);
        for (const rel of existingFiles) {
          if (!(rel in files)) {
            console.error(`Unexpected extra file in staged bundle ${bundleName}: ${rel}`);
            drifted = true;
          }
        }
        for (const [rel, contentBytes] of Object.entries(files)) {
          const outPath = path.join(bundleDest, rel);
          if (!existsSync(outPath) || !readFileSync(outPath).equals(contentBytes)) {
            console.error(`Drift in staged bundle ${bundleName}/${rel}`);
            drifted = true;
          }
        }
      }
    }
  }

  if (drifted) {
    throw new Error('Harness-adapter drift detected. Run `node scripts/assemble.mjs write` to reconcile.');
  }
}

function parseCliArgs(argv) {
  let mode = 'check';
  let modeSet = false;
  let outputDir;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--output-dir') {
      if (i + 1 >= argv.length) {
        throw new Error('Missing directory argument after --output-dir');
      }
      outputDir = argv[++i];
    } else if (arg.startsWith('--output-dir=')) {
      outputDir = arg.slice('--output-dir='.length);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!modeSet) {
      if (arg !== 'write' && arg !== 'check') {
        throw new Error(`Unknown command "${arg}". Expected "write" or "check".`);
      }
      mode = arg;
      modeSet = true;
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
  }
  return { mode, outputDir };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { mode, outputDir } = parseCliArgs(process.argv.slice(2));
    assemble(mode, outputDir !== undefined ? { outputDir } : {});
    console.log(`Harness-adapter assemblies in sync (${mode}).`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
