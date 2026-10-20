import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from './assemble.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));

export function validate() {
  const errors = [];
  const warn = msg => console.warn(`[WARN] ${msg}`);
  const fail = msg => { errors.push(msg); console.error(`[FAIL] ${msg}`); };
  const pass = msg => console.log(`[PASS] ${msg}`);

  console.log('--- 1. Validating Plugin Manifest & Host Assemblies ---');
  if (!existsSync(path.join(root, 'plugin.json'))) {
    fail('Root plugin.json is missing');
  } else {
    const manifest = json('plugin.json');
    if (!manifest.name || manifest.name !== 'plan-product') fail('plugin.json name must be "plan-product"');
    if (!manifest.version || manifest.version !== '0.1.0') fail('plugin.json version must be "0.1.0"');
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
      if (!content.includes('## Execution Checklist') || !content.includes('- [ ]')) {
        fail(`${rel} missing '## Execution Checklist' with '- [ ]' items`);
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
      if (item.name === 'node_modules' || item.name === '.git' || item.name === '.temp') continue;
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
