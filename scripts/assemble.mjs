import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const PLUGIN_SCHEMA_V1 = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const HOST_INTERFACE = {
  displayName: 'plan-product',
  shortDescription: 'Plan products, features, use cases, and roadmaps.',
  longDescription: 'Define products, features, use cases, domain concepts, and dependency-ordered product roadmaps through guided conversations.',
  developerName: 'NyssaAI',
  category: 'Software engineering',
  capabilities: ['Interactive', 'Read', 'Write'],
  defaultPrompt: [
    'Plan this product',
    'Define a domain concept',
    'Plan a feature',
    'Document a use case',
    'Sequence the product roadmap',
    'Update the product',
    'Update the product roadmap',
    'Upgrade planning docs to v2',
  ],
  brandColor: '#2563EB',
};

export function assemble(mode = 'check') {
  const canonical = json('plugin.json');
  if (canonical.$schema !== PLUGIN_SCHEMA_V1) {
    throw new Error(`plugin.json $schema must equal ${PLUGIN_SCHEMA_V1}`);
  }
  if (typeof canonical.repository !== 'string' || !canonical.repository) {
    throw new Error('plugin.json repository must be a non-empty string');
  }
  if (!existsSync(path.join(root, 'skills/plan-product/SKILL.md'))) {
    throw new Error('Missing canonical facade skill: skills/plan-product/SKILL.md');
  }
  const commandFiles = readdirSync(path.join(root, 'commands'))
    .filter(f => f.endsWith('.md'))
    .map(f => `commands/${f}`)
    .sort();
  const workflowFiles = readdirSync(path.join(root, 'skills/plan-product/workflows'))
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort();
  const expectedCommands = workflowFiles.map(w => `commands/plan-${w}.md`).sort();
  if (JSON.stringify(commandFiles) !== JSON.stringify(expectedCommands)) {
    throw new Error(`commands/ (${commandFiles.join(', ')}) does not match skills/plan-product/workflows/ (${expectedCommands.join(', ')})`);
  }
  const ui = canonical.interface || HOST_INTERFACE;
  const hosts = [
    {
      file: '.claude-plugin/plugin.json',
      generate: () => ({
        name: canonical.name,
        version: canonical.version,
        description: canonical.description,
        author: canonical.author,
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
          developerName: canonical.author?.name || ui.developerName || 'jamaynor',
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
        skills: 'skills',
      }),
    },
    {
      file: 'gemini-extension.json',
      generate: () => ({
        name: canonical.name,
        description: canonical.description,
        version: canonical.version,
        contextFileName: 'GEMINI.md',
      }),
    },
  ];

  let drifted = false;
  for (const { file, generate } of hosts) {
    const generated = generate();
    const targetPath = path.join(root, file);
    const content = JSON.stringify(generated, null, 2) + '\n';
    if (mode === 'write') {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, content);
      console.log(`Updated ${file}`);
    } else {
      const existing = existsSync(targetPath) ? json(file) : null;
      if (JSON.stringify(existing) !== JSON.stringify(generated)) {
        console.error(`Drift in ${file}: manifest does not match canonical projection from plugin.json`);
        drifted = true;
      }
    }
  }

  if (drifted) throw new Error('Host adapter drift detected. Run `node scripts/assemble.mjs write` to reconcile.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] === 'write' ? 'write' : 'check';
  try {
    assemble(mode);
    console.log(`Host assemblies in sync (${mode}).`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
