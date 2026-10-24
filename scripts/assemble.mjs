import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

export function assemble(mode = 'check') {
  const canonical = json('plugin.json');
  const commandFiles = readdirSync(path.join(root, 'commands'))
    .filter(f => f.endsWith('.md'))
    .map(f => `commands/${f}`)
    .sort();
  const declaredCommands = [...(canonical.commands || [])].sort();
  if (JSON.stringify(commandFiles) !== JSON.stringify(declaredCommands)) {
    throw new Error(`plugin.json commands array (${declaredCommands.join(', ')}) does not match commands/ directory (${commandFiles.join(', ')})`);
  }
  const workflowFiles = readdirSync(path.join(root, 'skills/plan-product/workflows'))
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort();
  const expectedCommands = workflowFiles.map(w => `commands/plan-${w}.md`).sort();
  if (JSON.stringify(commandFiles) !== JSON.stringify(expectedCommands)) {
    throw new Error(`commands/ (${commandFiles.join(', ')}) does not match skills/plan-product/workflows/ (${expectedCommands.join(', ')})`);
  }
  const hosts = [
    {
      file: '.claude-plugin/plugin.json',
      generate: () => ({
        name: canonical.name,
        version: canonical.version,
        description: canonical.description,
        author: canonical.author,
        repository: typeof canonical.repository === 'object' ? canonical.repository.url : canonical.repository,
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
        repository: typeof canonical.repository === 'object' ? canonical.repository.url : canonical.repository,
        license: canonical.license,
        keywords: canonical.keywords,
        skills: './skills/',
        interface: {
          displayName: canonical.interface?.displayName || canonical.name,
          shortDescription: canonical.interface?.shortDescription || canonical.description,
          longDescription: canonical.interface?.longDescription || canonical.description,
          developerName: canonical.author?.name || 'jamaynor',
          category: canonical.interface?.category || 'Productivity',
          capabilities: canonical.interface?.capabilities || ['Interactive', 'Read', 'Write'],
          websiteURL: canonical.homepage,
          defaultPrompt: canonical.interface?.defaultPrompt || [],
          brandColor: canonical.interface?.brandColor || '#2563EB',
          screenshots: [],
        },
      }),
    },
    {
      file: '.cursor-plugin/plugin.json',
      generate: () => ({
        name: canonical.name,
        displayName: canonical.interface?.displayName || canonical.name,
        description: canonical.description,
        version: canonical.version,
        author: canonical.author,
        homepage: canonical.homepage,
        repository: typeof canonical.repository === 'object' ? canonical.repository.url : canonical.repository,
        license: canonical.license,
        keywords: canonical.keywords,
        skills: './skills/',
        commands: './commands/',
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
    const existing = json(file);
    const content = JSON.stringify(generated, null, 2) + '\n';
    if (mode === 'write') {
      writeFileSync(path.join(root, file), content);
      console.log(`Updated ${file}`);
    } else {
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
