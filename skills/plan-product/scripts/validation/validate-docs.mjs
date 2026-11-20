// Responsibility: Validate consumer repository Model v2 planning docs, docs/ allowed-set lockdown, Ubiquitous Language rules, concepts, status/blockers, and DP-pp.ss links without maintainer dependencies.
// Public interface:
// +-- parseYamlFrontmatter(content)
// +-- checkMarkdownRelativeLinks(fullPath, repoRoot, fail, label)
// +-- validateGitAttributesAndDocsIgnore(repoRoot, fail, pass, options)
// `-- validatePlanningDocs(repoRoot, options)

import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveBundledAssetsDir,
  resolvePlanningConfig,
  resolveRepoContainedPath,
  validatePlanningConfig,
} from '../init/repo-paths.mjs';

const BANNED_FEATURE_TITLE_JARGON = /\b(?:surgical|storage|ingestion|ingest|syndication)\b/i;
const VALID_FEATURE_UC_STATUSES = new Set([
  'planned',
  'blocked',
  'in-progress',
  'awaiting-deferred-verify',
  'completed',
  'complete',
]);

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

function stripFencedCodeBlocks(content) {
  return content
    .replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~)/gm, '')
    .replace(/```[\s\S]*?```/g, '');
}

function stripMarkdownCode(content) {
  return stripFencedCodeBlocks(content).replace(/(`+)([^`\n]*?)\1/g, (_m, _ticks, inner) =>
    inner.includes('](') ? '' : 'code'
  );
}

/**
 * Parse top-level YAML frontmatter scalars and folded/literal blocks into a plain object.
 */
export function parseYamlFrontmatter(content) {
  const clean = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const lines = match[1].replace(/\r\n/g, '\n').split('\n');
  const fields = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const [, key, rawRest] = keyMatch;
    const rest = rawRest.trim();
    i++;
    if (/^[>|][+-]?$/.test(rest)) {
      const folded = rest.startsWith('>');
      const blockLines = [];
      let blockIndent = null;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine.trim()) {
          if (blockIndent !== null) blockLines.push('');
          i++;
          continue;
        }
        const indent = nextLine.match(/^(\s*)/)[1].length;
        if (indent === 0) break;
        if (blockIndent === null) blockIndent = indent;
        blockLines.push(nextLine.slice(Math.min(blockIndent, nextLine.length)));
        i++;
      }
      while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') {
        blockLines.pop();
      }
      if (!folded) {
        fields[key] = blockLines.join('\n');
      } else {
        const paragraphs = [];
        let current = [];
        for (const bl of blockLines) {
          if (bl === '') {
            if (current.length > 0) {
              paragraphs.push(current.join(' '));
              current = [];
            }
            paragraphs.push('');
          } else {
            current.push(bl.trim());
          }
        }
        if (current.length > 0) paragraphs.push(current.join(' '));
        fields[key] = paragraphs.join('\n');
      }
    } else if (rest === '') {
      const cont = [];
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        cont.push(lines[i].trim());
        i++;
      }
      fields[key] = cont.join(' ');
    } else if (
      (rest.startsWith('"') && rest.endsWith('"') && rest.length >= 2) ||
      (rest.startsWith("'") && rest.endsWith("'") && rest.length >= 2)
    ) {
      fields[key] = rest.slice(1, -1);
    } else {
      const cont = [rest];
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        cont.push(lines[i].trim());
        i++;
      }
      fields[key] = cont.join(' ');
    }
  }
  return fields;
}

function isTemplateOnlyDocument(docPath, repoRoot, config, templateKey, bundledAssetFile, assetsDir) {
  if (!existsSync(docPath)) return false;
  const docNorm = normalizeText(readFileSync(docPath, 'utf8'));
  const configuredRel = config.paths?.[templateKey];
  if (configuredRel) {
    const configuredFull = path.join(repoRoot, configuredRel);
    if (existsSync(configuredFull) && normalizeText(readFileSync(configuredFull, 'utf8')) === docNorm) {
      return true;
    }
  }
  const bundledFull = path.join(assetsDir, 'templates', bundledAssetFile);
  return existsSync(bundledFull) && normalizeText(readFileSync(bundledFull, 'utf8')) === docNorm;
}

function validateDocStatusAndBlockers(content, fm, relPath, label, fail) {
  if (!fm) return;
  const status = typeof fm.status === 'string' ? fm.status.trim() : '';
  if (!VALID_FEATURE_UC_STATUSES.has(status)) {
    fail(
      `${label} ${relPath} frontmatter status must be one of ${[...VALID_FEATURE_UC_STATUSES].join(', ')} (found ${JSON.stringify(fm.status ?? null)})`
    );
    return;
  }
  const blockerBody = (
    content.split(/^##\s+Open Questions & Blockers(?:\r?\n|$)/m)[1]?.split(/^##\s+/m)[0] || ''
  ).trim();
  if (status === 'blocked' && !blockerBody) {
    fail(`${label} ${relPath} has status: blocked and must include a non-empty '## Open Questions & Blockers' section`);
  }
  if ((status === 'completed' || status === 'complete') && blockerBody) {
    fail(`${label} ${relPath} has status: ${status} and must not retain an open '## Open Questions & Blockers' section`);
  }
}

/**
 * Verify all relative Markdown links stay inside repoRoot and resolve to existing files or directories.
 */
export function checkMarkdownRelativeLinks(fullPath, repoRoot, fail, label) {
  const content = readFileSync(fullPath, 'utf8');
  const contentWithoutCode = stripMarkdownCode(content);
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(contentWithoutCode)) !== null) {
    const rawTarget = match[2].trim();
    const target =
      rawTarget.startsWith('<') && rawTarget.endsWith('>')
        ? rawTarget.slice(1, -1).trim()
        : rawTarget;
    if (
      !target ||
      /^(?:https?|mailto|file|tel|urn):/i.test(target) ||
      target.startsWith('#')
    ) {
      continue;
    }
    const targetFile = target.split('#')[0].trim();
    if (!targetFile) continue;
    const resolved = path.resolve(path.dirname(fullPath), targetFile);
    const relToRepo = path.relative(repoRoot, resolved);
    if (relToRepo.startsWith('..') || path.isAbsolute(relToRepo)) {
      fail(`Escaping relative link in ${label}: ${targetFile} escapes repo_root`);
      continue;
    }
    if (!existsSync(resolved)) {
      fail(`Broken relative link in ${label}: ${targetFile} (resolved to ${relToRepo.replaceAll('\\', '/')})`);
    }
  }
}

/**
 * Enforce LF .gitattributes (when required) and verify docs/ is tracked and never gitignored.
 */
export function validateGitAttributesAndDocsIgnore(repoRoot, fail, pass, { requireGitattributes = false } = {}) {
  if (requireGitattributes) {
    const gitattributesPath = path.join(repoRoot, '.gitattributes');
    if (!existsSync(gitattributesPath) || !lstatSync(gitattributesPath).isFile()) {
      fail('Missing root .gitattributes (must enforce LF line endings with eol=lf)');
    } else {
      const activeLines = readFileSync(gitattributesPath, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
      if (!activeLines.some(line => /\beol=lf\b/i.test(line))) {
        fail('.gitattributes must enforce LF line endings (missing active eol=lf rule)');
      } else {
        pass('.gitattributes enforces LF line endings (eol=lf)');
      }
    }
  }

  let docsIgnoredInFile = false;
  const gitignorePath = path.join(repoRoot, '.gitignore');
  if (existsSync(gitignorePath) && lstatSync(gitignorePath).isFile()) {
    for (const rawLine of readFileSync(gitignorePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('!')) {
        const neg = line.slice(1).trim();
        if (/^\/?docs\/?$/.test(neg)) {
          docsIgnoredInFile = false;
        }
        continue;
      }
      if (/^(?:\/|\*\*\/)?docs(?:\/(?:\*\*?)?)?$/.test(line)) {
        docsIgnoredInFile = true;
      }
    }
  }
  if (docsIgnoredInFile) {
    fail("'docs/' directory must be tracked in Git and never ignored in .gitignore");
  } else if (existsSync(path.join(repoRoot, '.git'))) {
    const res = spawnSync('git', ['check-ignore', '-q', 'docs'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    if (res.status === 0) {
      fail("'docs/' directory must be tracked in Git and never gitignored (git check-ignore matched docs)");
    }
  }
}

/**
 * Validate consumer repository (or monorepo --unit) Model v2 planning docs, concepts, features, use cases, and development plan.
 */
export function validatePlanningDocs(repoRoot = process.cwd(), options = {}) {
  const baseRoot = path.resolve(repoRoot);
  const targetRoot = options.unit
    ? resolveRepoContainedPath(baseRoot, options.unit.replaceAll('\\', '/'), 'unit')
    : baseRoot;
  const assetsDir = resolveBundledAssetsDir(options.pluginRoot ?? null);

  const ownErrors = [];
  const fail = options.fail ?? (msg => { ownErrors.push(msg); console.error(`[FAIL] ${msg}`); });
  const pass = options.pass ?? (msg => console.log(`[PASS] ${msg}`));

  if (!options.skipGitChecks) {
    validateGitAttributesAndDocsIgnore(targetRoot, fail, pass, { requireGitattributes: false });
  }

  if (existsSync(path.join(targetRoot, '.nyssa-ai/plan-product/usage'))) {
    fail('Mutable usage state at .nyssa-ai/plan-product/usage/ is disallowed; route usage telemetry to runtime_root (.nyssa-ai/plan-product/runtime/usage/)');
  }

  const repoConfigFile = path.join(targetRoot, '.nyssa-ai/plan-product/config.json');
  if (existsSync(repoConfigFile)) {
    try {
      validatePlanningConfig(JSON.parse(readFileSync(repoConfigFile, 'utf8')), '.nyssa-ai/plan-product/config.json');
    } catch (err) {
      fail(err.message);
    }
  }

  const config = resolvePlanningConfig(targetRoot, {
    userHome: options.userHome ?? null,
    pluginRoot: options.pluginRoot ?? null,
  });
  const docsDir = path.join(targetRoot, 'docs');
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
    const glossaryPath = path.join(targetRoot, config.paths?.glossary || 'docs/GLOSSARY.md');
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
      if (existsSync(fullDoc) && !isTemplateOnlyDocument(fullDoc, targetRoot, config, templateKey, bundledFile, assetsDir)) {
        checkMarkdownRelativeLinks(fullDoc, targetRoot, fail, `docs/${docFile}`);
      }
    }
  }

  const featuresInventoryPath = path.join(targetRoot, config.structure?.features?.inventory || config.paths?.features || 'docs/features.md');
  if (existsSync(featuresInventoryPath)) {
    const invContent = readFileSync(featuresInventoryPath, 'utf8');
    for (const m of invContent.matchAll(/^\s*[-*]\s+\[[ x]\]\s+(F-\d{2}\.\d{2}):\s*(.+)$/gm)) {
      if (BANNED_FEATURE_TITLE_JARGON.test(m[2])) {
        fail(`Feature title for ${m[1]} in ${path.relative(targetRoot, featuresInventoryPath).replaceAll('\\', '/')} contains banned jargon (Surgical, Storage, Ingestion, or Syndication): ${m[2]}`);
      }
    }
  }

  const conceptsRel = config.structure?.concepts?.root || config.paths?.concepts || 'docs/concepts';
  const conceptsDir = path.join(targetRoot, conceptsRel);
  const featuresRel = config.structure?.features?.root || config.paths?.featureDocs || 'docs/features';
  const featuresDir = path.join(targetRoot, featuresRel);

  const conceptMap = new Map();
  if (existsSync(conceptsDir) && statSync(conceptsDir).isDirectory()) {
    const conceptFiles = readdirSync(conceptsDir).filter(f => f.endsWith('.md')).sort();
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
      if (!entry.isDirectory()) {
        fail(`Disallowed file directly under ${featuresRel}/ (only f-gg.nn/ directories allowed): ${featuresRel}/${entry.name}`);
        continue;
      }
      const folderMatch = entry.name.match(/^f-(\d{2})\.(\d{2})$/);
      if (!folderMatch) {
        fail(`Non-canonical feature directory under ${featuresRel}/: ${featuresRel}/${entry.name}`);
        continue;
      }
      const [, gg, nn] = folderMatch;
      const expectedFeatId = `F-${gg}.${nn}`;
      const featDir = path.join(featuresDir, entry.name);
      const ucFileRegex = new RegExp(`^uc-${gg}\\.${nn}\\.(\\d{2})-[a-z0-9-]+\\.md$`);

      for (const child of readdirSync(featDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const childRel = `${featuresRel}/${entry.name}/${child.name}`;
        if (!child.isFile()) {
          fail(`Non-canonical entry under ${featuresRel}/${entry.name}/: ${childRel}`);
          continue;
        }
        if (child.name === 'feature.md') continue;
        const ucMatch = child.name.match(ucFileRegex);
        if (!ucMatch) {
          fail(`Non-canonical entry under ${featuresRel}/${entry.name}/: ${childRel}`);
          continue;
        }
        const expectedUcId = `UC-${gg}.${nn}.${ucMatch[1]}`;
        const ucPath = path.join(featDir, child.name);
        const ucContent = readFileSync(ucPath, 'utf8');
        const ucFm = parseYamlFrontmatter(ucContent);
        if (!ucFm) {
          fail(`Use case ${childRel} missing YAML frontmatter`);
        } else {
          if (ucFm.id !== expectedUcId) {
            fail(`Use case frontmatter id must match filename ID (${expectedUcId}) in ${childRel}`);
          }
          if (ucFm.feature !== expectedFeatId) {
            fail(`Use case frontmatter feature must match parent feature (${expectedFeatId}) in ${childRel}`);
          }
          validateDocStatusAndBlockers(ucContent, ucFm, childRel, 'Use case', fail);
        }
        checkMarkdownRelativeLinks(ucPath, targetRoot, fail, childRel);
      }

      const featPath = path.join(featDir, 'feature.md');
      if (!existsSync(featPath)) continue;
      const relFeat = path.relative(targetRoot, featPath).replaceAll('\\', '/');
      const featContent = readFileSync(featPath, 'utf8');
      const featFm = parseYamlFrontmatter(featContent);
      if (!featFm) {
        fail(`Feature ${relFeat} missing YAML frontmatter`);
      } else {
        if (featFm.id !== expectedFeatId) {
          fail(`Feature frontmatter id must match folder ID (${expectedFeatId}) in ${relFeat}`);
        }
        if (featFm.group !== gg) {
          fail(`Feature frontmatter group must match folder group ("${gg}") in ${relFeat}`);
        }
        validateDocStatusAndBlockers(featContent, featFm, relFeat, 'Feature', fail);
      }
      const headingMatch = featContent.match(/^#\s+F-\d{2}\.\d{2}\s+(.+)$/m);
      if (headingMatch && BANNED_FEATURE_TITLE_JARGON.test(headingMatch[1])) {
        fail(`Feature title in ${relFeat} contains banned jargon (Surgical, Storage, Ingestion, or Syndication): ${headingMatch[1]}`);
      }
      checkMarkdownRelativeLinks(featPath, targetRoot, fail, relFeat);
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
          const featId = featFm?.id || expectedFeatId;
          if (!partSection.includes(featId) && !partSection.includes(entry.name)) {
            fail(`Bi-directional link missing: Feature ${relFeat} links to concept ${path.relative(targetRoot, resolved).replaceAll('\\', '/')}, but that concept's '## Participating Features' does not reference ${featId}`);
          }
        }
      }
    }
  }

  const devPlanRel = config.structure?.developmentPlan?.file || config.paths?.developmentPlan || 'docs/plans/development-plan.md';
  const devPlanPath = path.join(targetRoot, devPlanRel);
  if (existsSync(devPlanPath)) {
    const devPlanContent = readFileSync(devPlanPath, 'utf8');
    if (/^\s*-\s+\[[ x]\]\s+R-\d+/m.test(devPlanContent)) {
      fail(`${devPlanRel} contains legacy R-* step IDs; use DP-pp.ss`);
    }
    if (!isTemplateOnlyDocument(devPlanPath, targetRoot, config, 'developmentPlanTemplate', 'development-plan.md', assetsDir)) {
      checkMarkdownRelativeLinks(devPlanPath, targetRoot, fail, devPlanRel);
    }
    pass(`Validated development plan (${devPlanRel})`);
  }

  if (!options.fail && ownErrors.length > 0) {
    throw new Error(`Validation failed with ${ownErrors.length} error(s).`);
  }
  return ownErrors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(
      'Usage: node <plugin_root>/skills/plan-product/scripts/validation/validate-docs.mjs [--repo-root <repo_root> | <repo_root>] [--unit <apps/...|tools/...>]\n' +
      'Validates Model v2 planning docs (docs/ lockdown, GLOSSARY.md, concepts, features, use cases, status/blockers, and DP-pp.ss links) with zero maintainer dependencies.'
    );
  } else {
    try {
      let targetRepo = null;
      let unit = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--repo-root' && i + 1 < args.length) targetRepo = args[++i];
        else if (args[i] === '--unit' && i + 1 < args.length) unit = args[++i];
        else if (!args[i].startsWith('-') && targetRepo === null) targetRepo = args[i];
      }
      validatePlanningDocs(targetRepo ? path.resolve(targetRepo) : process.cwd(), { unit });
      console.log('Planning documentation checks passed successfully!');
    } catch (err) {
      console.error(`\n${err.message}`);
      process.exitCode = 1;
    }
  }
}
