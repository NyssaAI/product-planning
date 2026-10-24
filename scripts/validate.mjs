import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from './assemble.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

export function validate(targetRoot = root) {
  targetRoot = path.resolve(targetRoot);
  const errors = [];
  const warn = msg => console.warn(`[WARN] ${msg}`);
  const fail = msg => { errors.push(msg); console.error(`[FAIL] ${msg}`); };
  const pass = msg => console.log(`[PASS] ${msg}`);

  if (targetRoot === root) {
    console.log('--- 1. Validating Plugin Manifest & Host Assemblies ---');
    if (!existsSync(path.join(root, 'plugin.json'))) {
      fail('Root plugin.json is missing');
    } else {
      const manifest = json('plugin.json');
      if (!manifest.name || manifest.name !== 'plan-product') fail('plugin.json name must be "plan-product"');
      if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) fail('plugin.json version must be valid semver');
      if (!manifest.skills || !Array.isArray(manifest.skills)) fail('plugin.json skills array is missing');
      if (!manifest.commands || !Array.isArray(manifest.commands)) fail('plugin.json commands array is missing');

      for (const skill of manifest.skills || []) {
        const skillFile = path.join(root, skill, 'SKILL.md');
        if (!existsSync(skillFile)) fail(`Declared skill missing SKILL.md: ${skill}`);
      }
      for (const cmd of manifest.commands || []) {
        if (!existsSync(path.join(root, cmd))) fail(`Declared command missing file: ${cmd}`);
      }
    }

    try {
      assemble('check');
      pass('Host manifest assemblies (.claude-plugin, .codex-plugin, .cursor-plugin, gemini-extension) in sync');
    } catch (err) {
      fail(err.message);
    }

    console.log('\n--- 2. Validating Scope Directives & Cognitive Formatting ---');
    const markdownFiles = [
      'skills/plan-product/SKILL.md',
      ...readdirSync(path.join(root, 'skills/plan-product/workflows'))
        .filter(f => f.endsWith('.md'))
        .map(f => `skills/plan-product/workflows/${f}`),
      ...readdirSync(path.join(root, 'commands'))
        .filter(f => f.endsWith('.md'))
        .map(f => `commands/${f}`),
    ];

    for (const rel of markdownFiles) {
      const full = path.join(root, rel);
      const content = readFileSync(full, 'utf8');
      const lines = content.split('\n');

      // Scope Directive check
      if (!content.includes('> [!IMPORTANT] Scope Directive')) {
        fail(`${rel} missing '> [!IMPORTANT] Scope Directive' header`);
      } else {
        pass(`${rel} contains Scope Directive`);
      }

      // Line count / context economics (<500 lines)
      if (lines.length > 500) {
        fail(`${rel} exceeds 500 line limit (${lines.length} lines)`);
      }

      // Verification checklist check
      if (rel.startsWith('skills/plan-product/workflows/')) {
        if (!content.includes('## Verification Checklist') || !content.includes('- [ ]')) {
          fail(`${rel} missing '## Verification Checklist' with '- [ ]' items`);
        }
      } else if (rel === 'skills/plan-product/SKILL.md') {
        if (!content.includes('## Verification') || !content.includes('- [ ]')) {
          fail(`${rel} missing '## Verification' with '- [ ]' items`);
        }
      }

      // Internal link integrity (ignoring code blocks and backticked example text)
      const contentWithoutCode = content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`\n]+`/g, '');
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(contentWithoutCode)) !== null) {
        const target = match[2].trim();
        // Skip external links, fragments, and templates placeholders
        if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#') || target.startsWith('<') || target.startsWith('file://')) continue;
        const targetFile = target.split('#')[0];
        if (!targetFile) continue;
        const resolved = path.resolve(path.dirname(full), targetFile);
        if (!existsSync(resolved)) {
          fail(`Broken relative link in ${rel}: ${targetFile} (resolved to ${path.relative(root, resolved)})`);
        }
      }
    }

    console.log('\n--- 3. Validating Filesystem Roles & Directory Layout ---');
    // Top-level directory whitelist
    const allowedTopLevelDirs = [
      'skills', 'src', 'test', 'evals', 'docs', 'scripts', 'adapters', 'rules',
      'commands', 'hooks', 'artifacts', '.temp', '.github',
      '.claude-plugin', '.codex-plugin', '.cursor-plugin', '.agents', '.hermes',
      '.nyssa-ai', '.claude', 'node_modules', '.git'
    ];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!allowedTopLevelDirs.includes(entry.name)) {
          fail(`Non-canonical top-level directory: ${entry.name}`);
        }
      } else if (entry.isFile()) {
        const allowedFiles = [
          'plugin.json', 'package.json', 'package-lock.json', 'README.md', 'LICENSE',
          'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'gemini-extension.json',
          '.gitignore', '.gitattributes'
        ];
        if (!allowedFiles.includes(entry.name)) {
          fail(`Loose non-canonical file at plugin root: ${entry.name}`);
        }
      }
    }

    const allowedEvalsChildren = ['suites', 'evidence', 'reports', 'waza', 'scenarios', 'results', 'attempts', 'tessl'];
    const evalsChildren = readdirSync(path.join(root, 'evals'), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const child of evalsChildren) {
      if (!allowedEvalsChildren.includes(child)) {
        fail(`Non-canonical evals/ immediate subdirectory: evals/${child} (allowed: ${allowedEvalsChildren.join(', ')})`);
      } else {
        pass(`evals/${child} belongs to canonical whitelist`);
      }
    }

    // Verify test isolation
    function scanTests(dir) {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const itemPath = path.join(dir, item.name);
        if (item.name === 'node_modules' || item.name === '.git' || item.name === '.temp' || item.name === '.nyssa-ai') continue;
        if (item.isDirectory()) {
          scanTests(itemPath);
        } else if (/\.(test|spec)\.(m?js|ts)$/.test(item.name)) {
          const rel = path.relative(root, itemPath).replaceAll('\\', '/');
          if (!rel.startsWith('test/')) {
            fail(`Co-mingled test file outside test/: ${rel}`);
          }
        }
      }
    }
    scanTests(root);
    pass('Automated test files isolated in test/');
  }

  console.log('\n--- 4. Validating Concepts & Feature Cross-Links ---');
  let configPath = path.join(targetRoot, '.nyssa-ai/plan-product/config.json');
  if (!existsSync(configPath)) {
    const legacyPath = path.join(targetRoot, '.plan-product/config.json');
    if (existsSync(legacyPath)) configPath = legacyPath;
  }
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const conceptsRel = config.structure?.concepts?.root || config.paths?.concepts || 'docs/concepts';
  const conceptsDir = path.join(targetRoot, conceptsRel);
  const featuresRel = config.structure?.features?.root || config.paths?.featureDocs || 'docs/features';
  const featuresDir = path.join(targetRoot, featuresRel);

  const conceptMap = new Map(); // conceptId -> { file, fullPath, referencedFeatures: Set<featureFullPath> }
  if (existsSync(conceptsDir) && statSync(conceptsDir).isDirectory()) {
    const conceptFiles = readdirSync(conceptsDir).filter(f => f.endsWith('.md') && f !== 'README.md').sort();
    for (const file of conceptFiles) {
      const fullPath = path.join(conceptsDir, file);
      const relPath = path.relative(targetRoot, fullPath).replaceAll('\\', '/');
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
      const typeMatch = fm.match(/^type:\s*(flow|domain-model)(?:\s+#.*)?\s*$/m);
      const statusMatch = fm.match(/^status:\s*\S+/m);
      if (!idMatch || idMatch[1] !== expectedId) {
        fail(`Concept frontmatter id must match filename ID (${expectedId}) in ${relPath}`);
      }
      if (!typeMatch) {
        fail(`Concept frontmatter type must be "flow" or "domain-model" in ${relPath}`);
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
            fail(`Bi-directional link missing: Concept ${expectedId} (${relPath}) lists ${path.relative(targetRoot, resolved).replaceAll('\\', '/')}, but that feature's '## Conceptual Context' does not link back to ${expectedId}`);
          }
        }
      }
      conceptMap.set(expectedId, { file, fullPath, referencedFeatures });
      pass(`Validated concept ${expectedId} (${relPath})`);
    }
  }

  if (existsSync(featuresDir) && statSync(featuresDir).isDirectory()) {
    for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const featPath = path.join(featuresDir, entry.name, 'feature.md');
      if (!existsSync(featPath)) continue;
      const relFeat = path.relative(targetRoot, featPath).replaceAll('\\', '/');
      const featContent = readFileSync(featPath, 'utf8');
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
            fail(`Bi-directional link missing: Feature ${relFeat} links to concept ${path.relative(targetRoot, resolved).replaceAll('\\', '/')}, but that concept's '## Participating Features' does not reference ${featId}`);
          }
        }
      }
    }
  }

  console.log('\n--- Validation Result ---');
  if (errors.length > 0) {
    throw new Error(`Validation failed with ${errors.length} error(s).`);
  }
  console.log('All structural, manifest, link, and cognitive checks passed successfully!');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    validate();
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  }
}
