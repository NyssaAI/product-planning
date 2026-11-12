// Responsibility: Migrate legacy Model v1 and legacy roadmap/usage assets in repo_root to canonical Model v2 development-plan and UL contracts.
// Public interface:
// `-- migrate(repoRoot)

import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

function rewriteDevelopmentPlanLinks(content, movedDeeper) {
  let updated = content
    .replace(/^#\s*(?:Product\s+)?Roadmap\b/m, '# Development Plan')
    .replace(/## Slices\b/g, '## Steps')
    .replace(/## How to Use This Roadmap\b/g, '## How to Use This Development Plan')
    .replace(/\bdocs\/roadmap\.md\b/g, 'docs/plans/development-plan.md')
    .replace(/\bdocs\/plans\/r-(\d{2}\.\d{2})-/g, 'docs/plans/dp-$1-');

  const stepMap = new Map();
  let v1Index = 1;
  updated = updated.replace(/- \[([ x])\] (R-\d{3}):/g, (_match, check, oldId) => {
    const newId = `DP-01.${String(v1Index++).padStart(2, '0')}`;
    stepMap.set(oldId, newId);
    return `- [${check}] ${newId}:`;
  });
  for (const [oldId, newId] of stepMap.entries()) {
    updated = updated.replaceAll(oldId, newId);
  }
  updated = updated.replace(/\bR-(\d{2}\.\d{2})\b/g, 'DP-$1');
  updated = updated.replace(/\bR-pp\.ss\b/g, 'DP-pp.ss');

  if (movedDeeper) {
    updated = updated.replace(
      /\]\(((?!\.\.\/|https?:\/\/|#|\/|file:\/\/)(?:features|concepts|specs|learnings)\/[^)]+)\)/g,
      '](../$1)'
    );
    updated = updated.replace(
      /\]\(((?:features|product|tech-stack|GLOSSARY)\.md(?:#[^)]*)?)\)/g,
      '](../$1)'
    );
  }
  return updated;
}

/**
 * Upgrade Model v1 (.plan-product/, F-Nxx, UC-nnn, R-NNN) and legacy v2 roadmap/concept/usage layouts to canonical Model v2.
 */
export function migrate(repoRoot = process.cwd()) {
  repoRoot = path.resolve(repoRoot);

  const legacyConfigFile = path.join(repoRoot, '.plan-product/config.json');
  const targetConfigFile = path.join(repoRoot, '.nyssa-ai/plan-product/config.json');

  let configFile = targetConfigFile;
  let isLegacyLocation = false;

  if (existsSync(legacyConfigFile)) {
    configFile = legacyConfigFile;
    isLegacyLocation = true;
  } else if (!existsSync(targetConfigFile)) {
    throw new Error(`Cannot find config at ${targetConfigFile} or ${legacyConfigFile}`);
  }

  const config = readJson(configFile);
  const results = {
    featuresMigrated: [],
    useCasesMigrated: [],
    filesUpdated: [],
    configUpgraded: false,
  };

  const featureRootRel = config.structure?.features?.root || config.paths?.featureDocs || 'docs/features';
  const featureRoot = path.join(repoRoot, featureRootRel);
  const featuresFile = path.join(repoRoot, config.paths?.features || 'docs/features.md');
  const productFile = path.join(repoRoot, config.paths?.product || 'docs/product.md');
  const conceptsRootRel = config.structure?.concepts?.root || config.paths?.concepts || 'docs/concepts';
  const conceptsRoot = path.join(repoRoot, conceptsRootRel);

  const legacyRoadmapRel = config.paths?.roadmap || config.structure?.roadmap?.file || 'docs/roadmap.md';
  const legacyRoadmapFile = path.join(repoRoot, legacyRoadmapRel);
  const nextDevPlanRel = (!config.paths?.developmentPlan || config.paths.developmentPlan === 'docs/roadmap.md')
    ? 'docs/plans/development-plan.md'
    : config.paths.developmentPlan;
  const targetDevPlanFile = path.join(repoRoot, nextDevPlanRel);

  const featureMap = new Map();
  const useCaseMap = new Map();

  if (existsSync(featureRoot)) {
    const entries = readdirSync(featureRoot, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const folder of entries) {
      const match = folder.match(/^f-(\d)(\d{2})$/i);
      if (match) {
        const groupNum = match[1].padStart(2, '0');
        const featNum = match[2];
        const oldId = `F-${match[1]}${featNum}`;
        const newId = `F-${groupNum}.${featNum}`;
        const newFolder = `f-${groupNum}.${featNum}`;
        featureMap.set(oldId, { oldId, newId, groupNum, featNum, oldFolder: folder, newFolder });
      }
    }

    for (const info of featureMap.values()) {
      const dirPath = path.join(featureRoot, info.oldFolder);
      const files = readdirSync(dirPath);
      const ucFiles = files.filter(f => f.startsWith('uc-') && f.endsWith('.md')).sort();
      let ucIndex = 1;
      for (const ucFile of ucFiles) {
        const ucMatch = ucFile.match(/^uc-(\d+)(.*)\.md$/i);
        if (ucMatch) {
          const oldUcId = `UC-${ucMatch[1].padStart(3, '0')}`;
          const uu = String(ucIndex++).padStart(2, '0');
          const newUcId = `UC-${info.groupNum}.${info.featNum}.${uu}`;
          const slug = ucMatch[2];
          const newUcFile = `uc-${info.groupNum}.${info.featNum}.${uu}${slug}.md`;

          useCaseMap.set(oldUcId, {
            oldUcId,
            newUcId,
            oldFile: ucFile,
            newFile: newUcFile,
            featureNewId: info.newId,
            folder: info.oldFolder,
          });

          const ucPath = path.join(dirPath, ucFile);
          let ucContent = readFileSync(ucPath, 'utf8');
          ucContent = ucContent.replace(/^feature:\s*F-\S+/m, `feature: ${info.newId}`);
          ucContent = ucContent.replace(/^id:\s*UC-\S+/m, `id: ${newUcId}`);
          ucContent = ucContent.replace(/^#\s*UC-\S+\s+/m, `# ${newUcId} `);
          ucContent = ucContent.replace(/F-\d{3}/g, info.newId);

          const newUcPath = path.join(dirPath, newUcFile);
          if (ucPath !== newUcPath) {
            writeFileSync(newUcPath, ucContent);
            rmSync(ucPath);
          } else {
            writeFileSync(ucPath, ucContent);
          }
          results.useCasesMigrated.push({ oldUcId, newUcId, file: newUcFile });
        }
      }

      const featMdPath = path.join(dirPath, 'feature.md');
      if (existsSync(featMdPath)) {
        let content = readFileSync(featMdPath, 'utf8');
        content = content.replace(/^id:\s*F-\S+/m, `id: ${info.newId}`);
        content = content.replace(/^phase:\s*\d+/m, `group: "${info.groupNum}"`);
        content = content.replace(/^#\s*F-\S+\s+/m, `# ${info.newId} `);
        content = content.replace(/## Use Case\r?\n/g, '## User Need\n\n## Use Cases\n');

        for (const uc of useCaseMap.values()) {
          if (uc.folder === info.oldFolder) {
            content = content.replaceAll(uc.oldFile, uc.newFile);
            content = content.replaceAll(uc.oldUcId, uc.newUcId);
          }
        }
        for (const sibling of featureMap.values()) {
          content = content.replaceAll(sibling.oldId, sibling.newId);
          content = content.replaceAll(`f-${sibling.oldId.slice(2).toLowerCase()}`, sibling.newFolder);
        }

        writeFileSync(featMdPath, content);
        results.filesUpdated.push(path.join(featureRootRel, info.oldFolder, 'feature.md').replaceAll('\\', '/'));
      }
    }

    for (const info of featureMap.values()) {
      const oldPath = path.join(featureRoot, info.oldFolder);
      const newPath = path.join(featureRoot, info.newFolder);
      if (oldPath !== newPath) renameSync(oldPath, newPath);
      results.featuresMigrated.push({ oldId: info.oldId, newId: info.newId, folder: info.newFolder });
    }

    // Also update R-pp.ss / docs/roadmap.md references inside already-v2 feature folders.
    for (const dirEntry of readdirSync(featureRoot, { withFileTypes: true }).filter(e => e.isDirectory())) {
      const dirPath = path.join(featureRoot, dirEntry.name);
      for (const mdFile of readdirSync(dirPath).filter(f => f.endsWith('.md'))) {
        const mdPath = path.join(dirPath, mdFile);
        const before = readFileSync(mdPath, 'utf8');
        const after = before
          .replace(/\bdocs\/roadmap\.md\b/g, nextDevPlanRel)
          .replace(/\bR-(\d{2}\.\d{2})\b/g, 'DP-$1')
          .replace(/\bR-pp\.ss\b/g, 'DP-pp.ss');
        if (after !== before) {
          writeFileSync(mdPath, after);
          results.filesUpdated.push(path.relative(repoRoot, mdPath).replaceAll('\\', '/'));
        }
      }
    }
  }

  // Upgrade concept frontmatter (type -> kind) and development-plan references.
  if (existsSync(conceptsRoot)) {
    for (const file of readdirSync(conceptsRoot).filter(f => f.endsWith('.md'))) {
      const cPath = path.join(conceptsRoot, file);
      const before = readFileSync(cPath, 'utf8');
      const after = before
        .replace(/^(---\r?\n[\s\S]*?)\btype:\s*(flow|domain-model)\b/m, '$1kind: $2')
        .replace(/\bdocs\/roadmap\.md\b/g, nextDevPlanRel)
        .replace(/\bR-(\d{2}\.\d{2})\b/g, 'DP-$1')
        .replace(/\bR-pp\.ss\b/g, 'DP-pp.ss');
      if (after !== before) {
        writeFileSync(cPath, after);
        results.filesUpdated.push(path.relative(repoRoot, cPath).replaceAll('\\', '/'));
      }
    }
  }

  // Update docs/product.md references if present.
  if (existsSync(productFile)) {
    const before = readFileSync(productFile, 'utf8');
    const after = before
      .replace(/\bdocs\/roadmap\.md\b/g, nextDevPlanRel)
      .replace(/\]\(roadmap\.md\)/g, '](plans/development-plan.md)')
      .replace(/\bR-(\d{2}\.\d{2})\b/g, 'DP-$1')
      .replace(/\bR-pp\.ss\b/g, 'DP-pp.ss');
    if (after !== before) {
      writeFileSync(productFile, after);
      results.filesUpdated.push(path.relative(repoRoot, productFile).replaceAll('\\', '/'));
    }
  }

  // Update docs/features.md.
  if (existsSync(featuresFile)) {
    let featInv = readFileSync(featuresFile, 'utf8');
    featInv = featInv.replace(/\|\s*Delivery Phase\s*\|/g, '| Feature Group |');
    featInv = featInv.replace(/### Phase (\d+)\s*[-:]\s*(.*)/g, (_m, p1, p2) => `### Group ${p1.padStart(2, '0')}: ${p2}`);
    featInv = featInv.replace(/Phase (\d+)\s*[-:]\s*(.*)/g, (_m, p1, p2) => `Group ${p1.padStart(2, '0')}: ${p2}`);

    for (const info of featureMap.values()) {
      featInv = featInv.replaceAll(info.oldId, info.newId);
      featInv = featInv.replaceAll(`features/${info.oldFolder}/feature.md`, `features/${info.newFolder}/feature.md`);
      featInv = featInv.replaceAll(`features/${info.oldFolder}/`, `features/${info.newFolder}/`);
    }

    const extractedDetails = [];
    featInv = featInv.replace(
      /^(\s*[-*]\s+\[[ x]\]\s+(F-\d{2}\.\d{2}):\s*)\[([^\]]+)\]\(([^)]+)\)(?:\s*[?—-]\s*(.*))?$/gm,
      (_match, prefix, id, title, link, desc) => {
        extractedDetails.push({ id, title, link, desc: desc ? desc.trim() : '' });
        return `${prefix}${title}`;
      }
    );

    if (extractedDetails.length > 0 && !featInv.includes('## Feature Inventory')) {
      const inventoryLines = ['', '---', '', '## Feature Inventory', ''];
      for (const item of extractedDetails) {
        inventoryLines.push(`**${item.id}: ${item.title}**  `);
        if (item.desc) inventoryLines.push(`${item.desc}  `);
        inventoryLines.push(`[Feature Guide: ${item.title}](${item.link})`, '');
      }
      featInv = featInv.trimEnd() + '\n' + inventoryLines.join('\n');
    }

    featInv = featInv
      .replace(
        /Feature IDs are stable `F-Nxx` identifiers[^.]*\./,
        'Feature IDs are stable `F-gg.nn` identifiers, where `gg` is the Feature Group (`00` for Foundation) and `nn` is the feature sequence.'
      )
      .replace(/\bRoadmap Step ID\b/g, 'Development Plan Step ID')
      .replace(/\bdocs\/roadmap\.md\b/g, nextDevPlanRel)
      .replace(/\bR-(\d{2}\.\d{2})\b/g, 'DP-$1')
      .replace(/\bR-pp\.ss\b/g, 'DP-pp.ss');

    writeFileSync(featuresFile, featInv);
    results.filesUpdated.push(path.relative(repoRoot, featuresFile).replaceAll('\\', '/'));
  }

  // Migrate legacy docs/roadmap.md (or update existing development-plan.md) -> docs/plans/development-plan.md (DP-pp.ss).
  const sourcePlanFile = existsSync(legacyRoadmapFile)
    ? legacyRoadmapFile
    : existsSync(targetDevPlanFile)
      ? targetDevPlanFile
      : null;
  if (sourcePlanFile) {
    let planContent = readFileSync(sourcePlanFile, 'utf8');
    for (const info of featureMap.values()) {
      planContent = planContent.replaceAll(info.oldId, info.newId);
      planContent = planContent.replaceAll(`features/${info.oldFolder}/feature.md`, `features/${info.newFolder}/feature.md`);
      planContent = planContent.replaceAll(`features/${info.oldFolder}/`, `features/${info.newFolder}/`);
    }
    for (const uc of useCaseMap.values()) {
      planContent = planContent.replaceAll(uc.oldFile, uc.newFile);
      planContent = planContent.replaceAll(uc.oldUcId, uc.newUcId);
    }
    const movedDeeper = path.dirname(sourcePlanFile) !== path.dirname(targetDevPlanFile);
    planContent = rewriteDevelopmentPlanLinks(planContent, movedDeeper);

    mkdirSync(path.dirname(targetDevPlanFile), { recursive: true });
    writeFileSync(targetDevPlanFile, planContent);
    if (sourcePlanFile !== targetDevPlanFile && existsSync(sourcePlanFile)) {
      rmSync(sourcePlanFile);
    }
    results.filesUpdated.push(path.relative(repoRoot, targetDevPlanFile).replaceAll('\\', '/'));
  }

  // Relocate legacy .nyssa-ai/plan-product/usage/ telemetry into runtime_root (.nyssa-ai/plan-product/runtime/usage/).
  const legacyUsageDir = path.join(repoRoot, '.nyssa-ai/plan-product/usage');
  const runtimeUsageDir = path.join(repoRoot, '.nyssa-ai/plan-product/runtime/usage');
  if (existsSync(legacyUsageDir)) {
    mkdirSync(path.dirname(runtimeUsageDir), { recursive: true });
    cpSync(legacyUsageDir, runtimeUsageDir, { recursive: true });
    rmSync(legacyUsageDir, { recursive: true, force: true });
  }

  // Upgrade config paths & structure to Model v2 (.nyssa-ai/plan-product/, glossary, developmentPlan).
  config.version = 2;
  config.paths = config.paths || {};
  for (const [key, val] of Object.entries(config.paths)) {
    if (typeof val === 'string' && val.startsWith('.plan-product/')) {
      config.paths[key] = val.replace(/^\.plan-product\//, '.nyssa-ai/plan-product/');
    }
  }
  delete config.paths.roadmap;
  delete config.paths.roadmapTemplate;
  if (!config.paths.repoRoot) config.paths.repoRoot = '.';
  if (!config.paths.glossary) config.paths.glossary = 'docs/GLOSSARY.md';
  if (!config.paths.glossaryTemplate) config.paths.glossaryTemplate = '.nyssa-ai/plan-product/templates/glossary.md';
  config.paths.developmentPlan = nextDevPlanRel;
  if (!config.paths.developmentPlanTemplate) {
    config.paths.developmentPlanTemplate = '.nyssa-ai/plan-product/templates/development-plan.md';
  }
  if (!config.paths.configSchema) config.paths.configSchema = '.nyssa-ai/plan-product/schema.json';
  if (!config.paths.templates) config.paths.templates = '.nyssa-ai/plan-product/templates';

  config.structure = config.structure || {};
  config.structure.features = config.structure.features || {};
  config.structure.features.inventory = config.structure.features.inventory || config.paths.features || 'docs/features.md';
  config.structure.features.root = config.structure.features.root || featureRootRel;
  config.structure.features.idPattern = 'F-gg.nn';
  config.structure.features.folderPattern = 'f-gg.nn';
  config.structure.features.featureFile = config.structure.features.featureFile || 'feature.md';
  config.structure.features.featurePathPattern = `${featureRootRel}/f-gg.nn/feature.md`;
  config.structure.features.useCaseIdPattern = 'UC-gg.nn.uu';
  config.structure.features.useCaseFilePattern = 'uc-gg.nn.uu-short-slug.md';
  config.structure.features.useCasePathPattern = `${featureRootRel}/f-gg.nn/uc-gg.nn.uu-short-slug.md`;

  config.structure.concepts = config.structure.concepts || {
    root: config.paths.concepts || 'docs/concepts',
    idPattern: 'C-nn',
    filePattern: 'c-nn-short-slug.md',
    pathPattern: 'docs/concepts/c-nn-short-slug.md',
  };

  delete config.structure.roadmap;
  config.structure.developmentPlan = {
    file: nextDevPlanRel,
    idPattern: 'DP-pp.ss',
  };

  mkdirSync(path.dirname(targetConfigFile), { recursive: true });
  writeFileSync(targetConfigFile, JSON.stringify(config, null, 2) + '\n');
  results.configUpgraded = true;
  results.filesUpdated.push(path.relative(repoRoot, targetConfigFile).replaceAll('\\', '/'));

  const targetSchemaFile = path.join(repoRoot, '.nyssa-ai/plan-product/schema.json');
  const bundleSchema = path.join(PLUGIN_ROOT, 'skills/plan-product/assets/schema.json');
  if (existsSync(bundleSchema)) {
    writeFileSync(targetSchemaFile, readFileSync(bundleSchema, 'utf8'));
    results.filesUpdated.push(path.relative(repoRoot, targetSchemaFile).replaceAll('\\', '/'));
  }

  const legacyTemplatesDir = path.join(repoRoot, '.plan-product/templates');
  const targetTemplatesDir = path.join(repoRoot, '.nyssa-ai/plan-product/templates');
  if (existsSync(legacyTemplatesDir)) {
    mkdirSync(targetTemplatesDir, { recursive: true });
    for (const f of readdirSync(legacyTemplatesDir)) {
      if (f === 'roadmap.md') continue;
      cpSync(path.join(legacyTemplatesDir, f), path.join(targetTemplatesDir, f));
    }
  }
  const staleRoadmapTemplate = path.join(targetTemplatesDir, 'roadmap.md');
  if (existsSync(staleRoadmapTemplate)) {
    rmSync(staleRoadmapTemplate, { force: true });
  }

  if (isLegacyLocation && existsSync(path.join(repoRoot, '.plan-product'))) {
    rmSync(path.join(repoRoot, '.plan-product'), { recursive: true, force: true });
  }

  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node <plugin_root>/src/migration/migrate.mjs [--repo-root <repo_root> | <repo_root>]\nMigrates planning assets from Model v1 (.plan-product/, F-Nxx, UC-nnn, R-NNN) and legacy v2 roadmaps (docs/roadmap.md, R-pp.ss) to canonical Model v2 (.nyssa-ai/plan-product/, F-gg.nn, UC-gg.nn.uu, docs/plans/development-plan.md, DP-pp.ss).');
  } else {
    try {
      let targetRepo = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--repo-root' && i + 1 < args.length) targetRepo = args[++i];
        else if (!args[i].startsWith('-') && targetRepo === null) targetRepo = args[i];
      }
      console.log(JSON.stringify(migrate(targetRepo || process.cwd()), null, 2));
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
  }
}
