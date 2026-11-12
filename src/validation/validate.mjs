// Responsibility: Validate plugin manifests, harness-adapters, docs/ allowed-set lockdown, Ubiquitous Language rules, concepts, and DP-pp.ss links.
// Public interface:
// `-- validate(repoRoot, options)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../../scripts/assemble.mjs';
import { resolvePlanningConfig } from '../init/repo-paths.mjs';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readPluginJson = file => JSON.parse(readFileSync(path.join(PLUGIN_ROOT, file), 'utf8'));
const BANNED_FEATURE_TITLE_JARGON = /\b(?:surgical|storage|ingestion|ingest|syndication)\b/i;

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

/**
 * Template-Only Detection: returns true when docPath is unedited boilerplate matching its configured or bundled template.
 */
function isTemplateOnlyDocument(docPath, repoRoot, config, templateKey, bundledAssetFile) {
  if (!existsSync(docPath)) return false;
  const docNorm = normalizeText(readFileSync(docPath, 'utf8'));
  const configuredRel = config.paths?.[templateKey];
  if (configuredRel) {
    const configuredFull = path.join(repoRoot, configuredRel);
    if (existsSync(configuredFull) && normalizeText(readFileSync(configuredFull, 'utf8')) === docNorm) {
      return true;
    }
  }
  const bundledFull = path.join(PLUGIN_ROOT, 'skills/plan-product/assets/templates', bundledAssetFile);
  return existsSync(bundledFull) && normalizeText(readFileSync(bundledFull, 'utf8')) === docNorm;
}

function checkMarkdownRelativeLinks(fullPath, repoRoot, fail, label) {
  const content = readFileSync(fullPath, 'utf8');
  const contentWithoutCode = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '');
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(contentWithoutCode)) !== null) {
    const target = match[2].trim();
    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('#') ||
      target.startsWith('<') ||
      target.startsWith('file://')
    ) {
      continue;
    }
    const targetFile = target.split('#')[0];
    if (!targetFile) continue;
    const resolved = path.resolve(path.dirname(fullPath), targetFile);
    if (!existsSync(resolved)) {
      fail(`Broken relative link in ${label}: ${targetFile} (resolved to ${path.relative(repoRoot, resolved).replaceAll('\\', '/')})`);
    }
  }
}

/**
 * Validate plugin structural integrity (when repoRoot === plugin_root) and planning documentation contracts in repoRoot.
 */
export function validate(repoRoot = PLUGIN_ROOT, options = {}) {
  repoRoot = path.resolve(repoRoot);
  const errors = [];
  const fail = msg => { errors.push(msg); console.error(`[FAIL] ${msg}`); };
  const pass = msg => console.log(`[PASS] ${msg}`);

  if (repoRoot === PLUGIN_ROOT) {
    console.log('--- 1. Validating Plugin Manifest & Harness-Adapter Assemblies ---');
    if (!existsSync(path.join(PLUGIN_ROOT, 'plugin.json'))) {
      fail('Root plugin.json is missing');
    } else {
      const manifest = readPluginJson('plugin.json');
      const portableFields = new Set([
        '$schema', 'name', 'version', 'description', 'author',
        'homepage', 'repository', 'license', 'keywords', 'extensions',
      ]);
      if (manifest.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
        fail('plugin.json $schema must be "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"');
      }
      if (!manifest.name || manifest.name !== 'plan-product') fail('plugin.json name must be "plan-product"');
      if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) fail('plugin.json version must be valid semver');
      if (typeof manifest.repository !== 'string' || !manifest.repository) fail('plugin.json repository must be a non-empty string');
      for (const key of Object.keys(manifest)) {
        if (!portableFields.has(key)) {
          fail(`plugin.json contains non-portable Agent Plugins v1 field: ${key}`);
        }
      }
      if (!existsSync(path.join(PLUGIN_ROOT, 'skills/plan-product/SKILL.md'))) {
        fail('Missing canonical skill: skills/plan-product/SKILL.md');
      }
      const commandFiles = existsSync(path.join(PLUGIN_ROOT, 'commands'))
        ? readdirSync(path.join(PLUGIN_ROOT, 'commands')).filter(f => f.endsWith('.md'))
        : [];
      if (commandFiles.length === 0) {
        fail('commands/ directory must contain at least one Markdown command wrapper');
      }
    }

    try {
      assemble('check');
      pass('Harness-adapter assemblies (.claude-plugin, .codex-plugin, .cursor-plugin, .tessl-plugin, gemini-extension) in sync');
    } catch (err) {
      fail(err.message);
    }

    console.log('\n--- 2. Validating Scope Directives & Cognitive Formatting ---');
    const markdownFiles = [
      'skills/plan-product/SKILL.md',
      ...readdirSync(path.join(PLUGIN_ROOT, 'skills/plan-product/workflows'))
        .filter(f => f.endsWith('.md'))
        .map(f => `skills/plan-product/workflows/${f}`),
      ...readdirSync(path.join(PLUGIN_ROOT, 'commands'))
        .filter(f => f.endsWith('.md'))
        .map(f => `commands/${f}`),
    ];

    for (const rel of markdownFiles) {
      const full = path.join(PLUGIN_ROOT, rel);
      const content = readFileSync(full, 'utf8');
      const lines = content.split('\n');

      if (!content.includes('> [!IMPORTANT] Scope Directive')) {
        fail(`${rel} missing '> [!IMPORTANT] Scope Directive' header`);
      } else {
        pass(`${rel} contains Scope Directive`);
      }

      if (lines.length > 500) {
        fail(`${rel} exceeds 500 line limit (${lines.length} lines)`);
      }

      if (rel.startsWith('skills/plan-product/workflows/')) {
        if (!content.includes('## Verification Checklist') || !content.includes('- [ ]')) {
          fail(`${rel} missing '## Verification Checklist' with '- [ ]' items`);
        }
      } else if (rel === 'skills/plan-product/SKILL.md') {
        if (!content.includes('## Verification') || !content.includes('- [ ]')) {
          fail(`${rel} missing '## Verification' with '- [ ]' items`);
        }
      }

      checkMarkdownRelativeLinks(full, PLUGIN_ROOT, fail, rel);
    }

    console.log('\n--- 3. Validating Filesystem Roles & Directory Layout ---');
    const allowedTopLevelDirs = [
      'skills', 'src', 'test', 'evals', 'docs', 'scripts',
      'commands', 'harness-adapters', '.temp', '.github',
      '.claude-plugin', '.codex-plugin', '.cursor-plugin', '.tessl-plugin',
      '.nyssa-ai', '.claude', 'node_modules', '.git',
    ];
    for (const entry of readdirSync(PLUGIN_ROOT, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!allowedTopLevelDirs.includes(entry.name)) {
          fail(`Non-canonical top-level directory: ${entry.name}`);
        }
      } else if (entry.isFile()) {
        const allowedFiles = [
          'plugin.json', 'package.json', 'package-lock.json', 'README.md', 'LICENSE',
          'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'gemini-extension.json', 'codegraph.json',
          '.gitignore', '.gitattributes',
        ];
        if (!allowedFiles.includes(entry.name)) {
          fail(`Loose non-canonical file at plugin_root: ${entry.name}`);
        }
      }
    }

    if (existsSync(path.join(PLUGIN_ROOT, 'src')) && !existsSync(path.join(PLUGIN_ROOT, 'docs/code-map/codegraph.db'))) {
      fail('docs/code-map/codegraph.db is mandatory whenever src/ exists');
    }

    const allowedEvalsChildren = ['waza', 'scenarios', 'reports', 'tessl'];
    const evalsChildren = readdirSync(path.join(PLUGIN_ROOT, 'evals'), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
    for (const child of evalsChildren) {
      if (!allowedEvalsChildren.includes(child)) {
        fail(`Non-canonical evals/ immediate subdirectory: evals/${child} (allowed: ${allowedEvalsChildren.join(', ')})`);
      } else {
        pass(`evals/${child} belongs to canonical whitelist`);
      }
    }

    const bannedSrcDirs = new Set(['adapters', 'ports', 'storage', 'contracts', 'shared', 'utils', 'helpers', 'common', 'misc', 'types', 'models']);
    function scanSrcDirs(dir) {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        if (!item.isDirectory()) continue;
        if (bannedSrcDirs.has(item.name.toLowerCase())) {
          fail(`Banned horizontal directory inside src/: ${path.relative(PLUGIN_ROOT, path.join(dir, item.name)).replaceAll('\\', '/')}`);
        }
        scanSrcDirs(path.join(dir, item.name));
      }
    }
    scanSrcDirs(path.join(PLUGIN_ROOT, 'src'));

    function scanTests(dir) {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const itemPath = path.join(dir, item.name);
        if (item.name === 'node_modules' || item.name === '.git' || item.name === '.temp' || item.name === '.nyssa-ai') continue;
        if (item.isDirectory()) {
          scanTests(itemPath);
        } else if (/\.(test|spec)\.(m?js|ts)$/.test(item.name)) {
          const rel = path.relative(PLUGIN_ROOT, itemPath).replaceAll('\\', '/');
          if (!rel.startsWith('test/unit/') && !rel.startsWith('test/use_case/') && !rel.startsWith('test/e2e/')) {
            fail(`Automated test file must reside under test/unit/, test/use_case/, or test/e2e/: ${rel}`);
          }
        }
      }
    }
    scanTests(PLUGIN_ROOT);
    pass('Automated test files isolated in test/unit/ and test/use_case/');
  }

  console.log('\n--- 4. Validating docs/ Lockdown, Concepts, Jargon & Development Plan ---');
  if (existsSync(path.join(repoRoot, '.nyssa-ai/plan-product/usage'))) {
    fail('Mutable usage state at .nyssa-ai/plan-product/usage/ is disallowed; route usage telemetry to runtime_root (.nyssa-ai/plan-product/runtime/usage/)');
  }

  const config = resolvePlanningConfig(repoRoot, { userHome: options.userHome ?? null });
  const docsDir = path.join(repoRoot, 'docs');
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
    const allowedDocsFiles = new Set(['GLOSSARY.md', 'product.md', 'features.md', 'tech-stack.md']);
    const allowedDocsDirs = new Set(['code-map', 'concepts', 'features', 'plans', 'learnings', 'specs']);
    for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
      if (entry.isFile() && !allowedDocsFiles.has(entry.name)) {
        fail(`Disallowed file in docs/ allowed-set lockdown: docs/${entry.name}`);
      } else if (entry.isDirectory() && !allowedDocsDirs.has(entry.name)) {
        fail(`Disallowed directory in docs/ allowed-set lockdown: docs/${entry.name}/`);
      }
    }
    const glossaryPath = path.join(repoRoot, config.paths?.glossary || 'docs/GLOSSARY.md');
    if (!existsSync(glossaryPath)) {
      fail(`Mandatory Ubiquitous Language glossary missing: ${config.paths?.glossary || 'docs/GLOSSARY.md'}`);
    }
    const specsDir = path.join(docsDir, 'specs');
    if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
      for (const entry of readdirSync(specsDir, { withFileTypes: true })) {
        if (entry.isFile() && !entry.name.endsWith('.json')) {
          fail(`Disallowed non-JSON file inside docs/specs/: docs/specs/${entry.name}`);
        }
      }
    }
    const coreDocTemplates = [
      ['GLOSSARY.md', 'glossaryTemplate', 'glossary.md'],
      ['product.md', 'productTemplate', 'product.md'],
      ['features.md', 'featuresTemplate', 'features.md'],
      ['tech-stack.md', 'techStackTemplate', 'tech-stack.md'],
    ];
    for (const [docFile, templateKey, bundledFile] of coreDocTemplates) {
      const fullDoc = path.join(docsDir, docFile);
      if (existsSync(fullDoc) && !isTemplateOnlyDocument(fullDoc, repoRoot, config, templateKey, bundledFile)) {
        checkMarkdownRelativeLinks(fullDoc, repoRoot, fail, `docs/${docFile}`);
      }
    }
  }

  const featuresInventoryPath = path.join(repoRoot, config.structure?.features?.inventory || config.paths?.features || 'docs/features.md');
  if (existsSync(featuresInventoryPath)) {
    const invContent = readFileSync(featuresInventoryPath, 'utf8');
    for (const m of invContent.matchAll(/^\s*[-*]\s+\[[ x]\]\s+(F-\d{2}\.\d{2}):\s*(.+)$/gm)) {
      if (BANNED_FEATURE_TITLE_JARGON.test(m[2])) {
        fail(`Feature title for ${m[1]} in ${path.relative(repoRoot, featuresInventoryPath).replaceAll('\\', '/')} contains banned jargon (Surgical, Storage, Ingestion, or Syndication): ${m[2]}`);
      }
    }
  }

  const conceptsRel = config.structure?.concepts?.root || config.paths?.concepts || 'docs/concepts';
  const conceptsDir = path.join(repoRoot, conceptsRel);
  const featuresRel = config.structure?.features?.root || config.paths?.featureDocs || 'docs/features';
  const featuresDir = path.join(repoRoot, featuresRel);

  const conceptMap = new Map();
  if (existsSync(conceptsDir) && statSync(conceptsDir).isDirectory()) {
    const conceptFiles = readdirSync(conceptsDir).filter(f => f.endsWith('.md')).sort();
    for (const file of conceptFiles) {
      const fullPath = path.join(conceptsDir, file);
      const relPath = path.relative(repoRoot, fullPath).replaceAll('\\', '/');
      const fileMatch = file.match(/^c-(\d{2})-[a-z0-9-]+\.md$/);
      if (!fileMatch) {
        fail(`Concept filename does not match c-nn-short-slug.md pattern: ${relPath}`);
        continue;
      }
      const expectedId = `C-${fileMatch[1]}`;
      const content = readFileSync(fullPath, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) {
        fail(`Concept file missing YAML frontmatter: ${relPath}`);
        continue;
      }
      const fm = fmMatch[1];
      const idMatch = fm.match(/^id:\s*(C-\d{2})\s*$/m);
      const kindMatch = fm.match(/^kind:\s*(flow|domain-model)(?:\s+#.*)?\s*$/m);
      const legacyTypeMatch = fm.match(/^type:\s*/m);
      const statusMatch = fm.match(/^status:\s*\S+/m);
      if (!idMatch || idMatch[1] !== expectedId) {
        fail(`Concept frontmatter id must match filename ID (${expectedId}) in ${relPath}`);
      }
      if (legacyTypeMatch) {
        fail(`Concept frontmatter uses retired 'type:' field instead of 'kind:' (Concept Kind) in ${relPath}`);
      }
      if (!kindMatch) {
        fail(`Concept frontmatter kind must be "flow" or "domain-model" in ${relPath}`);
      }
      if (!statusMatch) {
        fail(`Concept frontmatter missing status in ${relPath}`);
      }
      const expectedSeq = String(conceptMap.size + 1).padStart(2, '0');
      if (fileMatch[1] !== expectedSeq) {
        fail(`Concept numbering out of sequence: expected C-${expectedSeq} but found ${expectedId} in ${relPath}`);
      }

      const referencedFeatures = new Set();
      const partSection = content.split(/^## Participating Features\r?\n/m)[1]?.split(/^## /m)[0] || '';
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(partSection)) !== null) {
        const target = m[2].trim().split('#')[0];
        if (!target) continue;
        const resolved = path.resolve(path.dirname(fullPath), target);
        if (!existsSync(resolved)) {
          fail(`Concept ${expectedId} (${relPath}) links to non-existent feature: ${target}`);
        } else {
          referencedFeatures.add(resolved);
          const featContent = readFileSync(resolved, 'utf8');
          const conceptContextSection = featContent.split(/^## Conceptual Context\r?\n/m)[1]?.split(/^## /m)[0] || '';
          const hasReciprocal = conceptContextSection.includes(expectedId) || conceptContextSection.includes(file);
          if (!hasReciprocal) {
            fail(`Bi-directional link missing: Concept ${expectedId} (${relPath}) lists ${path.relative(repoRoot, resolved).replaceAll('\\', '/')}, but that feature's '## Conceptual Context' does not link back to ${expectedId}`);
          }
        }
      }
      conceptMap.set(expectedId, { file, fullPath, referencedFeatures });
      pass(`Validated concept ${expectedId} (${relPath})`);
    }
  }

  if (existsSync(featuresDir) && statSync(featuresDir).isDirectory()) {
    for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        fail(`Disallowed file directly under ${featuresRel}/ (only f-gg.nn/ directories allowed): ${featuresRel}/${entry.name}`);
        continue;
      }
      if (!/^f-\d{2}\.\d{2}$/.test(entry.name)) {
        fail(`Non-canonical feature directory under ${featuresRel}/: ${featuresRel}/${entry.name}`);
        continue;
      }
      const featPath = path.join(featuresDir, entry.name, 'feature.md');
      if (!existsSync(featPath)) continue;
      const relFeat = path.relative(repoRoot, featPath).replaceAll('\\', '/');
      const featContent = readFileSync(featPath, 'utf8');
      const headingMatch = featContent.match(/^#\s+F-\d{2}\.\d{2}\s+(.+)$/m);
      if (headingMatch && BANNED_FEATURE_TITLE_JARGON.test(headingMatch[1])) {
        fail(`Feature title in ${relFeat} contains banned jargon (Surgical, Storage, Ingestion, or Syndication): ${headingMatch[1]}`);
      }
      checkMarkdownRelativeLinks(featPath, repoRoot, fail, relFeat);
      const conceptContextSection = featContent.split(/^## Conceptual Context\r?\n/m)[1]?.split(/^## /m)[0] || '';
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(conceptContextSection)) !== null) {
        const target = m[2].trim().split('#')[0];
        if (!target) continue;
        const resolved = path.resolve(path.dirname(featPath), target);
        if (!existsSync(resolved)) {
          fail(`Feature ${relFeat} links to non-existent concept in '## Conceptual Context': ${target}`);
        } else {
          const conceptContent = readFileSync(resolved, 'utf8');
          const partSection = conceptContent.split(/^## Participating Features\r?\n/m)[1]?.split(/^## /m)[0] || '';
          const featIdMatch = featContent.match(/^id:\s*(F-\S+)/m);
          const featId = featIdMatch ? featIdMatch[1] : entry.name;
          if (!partSection.includes(featId) && !partSection.includes(entry.name)) {
            fail(`Bi-directional link missing: Feature ${relFeat} links to concept ${path.relative(repoRoot, resolved).replaceAll('\\', '/')}, but that concept's '## Participating Features' does not reference ${featId}`);
          }
        }
      }
    }
  }

  const devPlanRel = config.structure?.developmentPlan?.file || config.paths?.developmentPlan || 'docs/plans/development-plan.md';
  const devPlanPath = path.join(repoRoot, devPlanRel);
  if (existsSync(devPlanPath)) {
    const devPlanContent = readFileSync(devPlanPath, 'utf8');
    if (/^\s*-\s+\[[ x]\]\s+R-\d+/m.test(devPlanContent)) {
      fail(`${devPlanRel} contains legacy R-* step IDs; use DP-pp.ss`);
    }
    if (!isTemplateOnlyDocument(devPlanPath, repoRoot, config, 'developmentPlanTemplate', 'development-plan.md')) {
      checkMarkdownRelativeLinks(devPlanPath, repoRoot, fail, devPlanRel);
    }
    pass(`Validated development plan (${devPlanRel})`);
  }

  console.log('\n--- Validation Result ---');
  if (errors.length > 0) {
    throw new Error(`Validation failed with ${errors.length} error(s).`);
  }
  console.log('All structural, manifest, lockdown, link, and cognitive checks passed successfully!');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let targetRepo = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--repo-root' && i + 1 < args.length) targetRepo = args[++i];
      else if (!args[i].startsWith('-') && targetRepo === null) targetRepo = args[i];
    }
    validate(targetRepo ? path.resolve(targetRepo) : PLUGIN_ROOT);
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  }
}
