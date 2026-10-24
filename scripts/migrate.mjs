import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

export function migrate(root = process.cwd()) {
  root = path.resolve(root);
  const configFile = path.join(root, '.plan-product/config.json');
  if (!existsSync(configFile)) {
    throw new Error(`Cannot find config at ${configFile}`);
  }

  const config = readJson(configFile);
  const results = {
    featuresMigrated: [],
    useCasesMigrated: [],
    filesUpdated: [],
    configUpgraded: false
  };

  const featureRootRel = config.structure?.features?.root || config.paths?.featureDocs || 'docs/features';
  const featureRoot = path.join(root, featureRootRel);
  const featuresFile = path.join(root, config.paths?.features || 'docs/features.md');
  const roadmapFile = path.join(root, config.paths?.roadmap || 'docs/roadmap.md');

  const featureMap = new Map(); // oldId -> { newId, oldFolder, newFolder }
  const useCaseMap = new Map(); // oldUcId -> { newUcId, oldFile, newFile, featureNewId }

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
        featureMap.set(oldId, {
          oldId,
          newId,
          groupNum,
          featNum,
          oldFolder: folder,
          newFolder
        });
      }
    }

    // First pass: rename use cases inside folders and update feature.md
    for (const info of featureMap.values()) {
      const dirPath = path.join(featureRoot, info.oldFolder);
      const files = readdirSync(dirPath);

      // Find use cases
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
            folder: info.oldFolder
          });

          // Read and update use case content
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

      // Update feature.md
      const featMdPath = path.join(dirPath, 'feature.md');
      if (existsSync(featMdPath)) {
        let content = readFileSync(featMdPath, 'utf8');
        content = content.replace(/^id:\s*F-\S+/m, `id: ${info.newId}`);
        content = content.replace(/^phase:\s*\d+/m, `group: "${info.groupNum}"`);
        content = content.replace(/^#\s*F-\S+\s+/m, `# ${info.newId} `);
        content = content.replace(/## Use Case\r?\n/g, '## User Need\n\n## Use Cases\n');

        // Update any use case links in feature.md
        for (const uc of useCaseMap.values()) {
          if (uc.folder === info.oldFolder) {
            content = content.replaceAll(uc.oldFile, uc.newFile);
            content = content.replaceAll(uc.oldUcId, uc.newUcId);
          }
        }
        // Update any sibling feature references
        for (const sibling of featureMap.values()) {
          content = content.replaceAll(sibling.oldId, sibling.newId);
          content = content.replaceAll(`f-${sibling.oldId.slice(2).toLowerCase()}`, sibling.newFolder);
        }

        writeFileSync(featMdPath, content);
        results.filesUpdated.push(path.join(featureRootRel, info.oldFolder, 'feature.md').replaceAll('\\', '/'));
      }
    }

    // Second pass: rename directories
    for (const info of featureMap.values()) {
      const oldPath = path.join(featureRoot, info.oldFolder);
      const newPath = path.join(featureRoot, info.newFolder);
      if (oldPath !== newPath) {
        renameSync(oldPath, newPath);
      }
      results.featuresMigrated.push({ oldId: info.oldId, newId: info.newId, folder: info.newFolder });
    }
  }

  // Update docs/features.md
  if (existsSync(featuresFile)) {
    let featInv = readFileSync(featuresFile, 'utf8');
    featInv = featInv.replace(/\|\s*Delivery Phase\s*\|/g, '| Feature Group |');
    featInv = featInv.replace(/### Phase (\d+)\s*[-:]\s*(.*)/g, (match, p1, p2) => `### Group ${p1.padStart(2, '0')}: ${p2}`);
    featInv = featInv.replace(/Phase (\d+)\s*[-:]\s*(.*)/g, (match, p1, p2) => `Group ${p1.padStart(2, '0')}: ${p2}`);

    for (const info of featureMap.values()) {
      featInv = featInv.replaceAll(info.oldId, info.newId);
      featInv = featInv.replaceAll(`features/${info.oldFolder}/feature.md`, `features/${info.newFolder}/feature.md`);
      featInv = featInv.replaceAll(`features/${info.oldFolder}/`, `features/${info.newFolder}/`);
    }

    // Strip links and inline descriptions from checklist items so ## Feature Checklist Summary has no links
    const extractedDetails = [];
    featInv = featInv.replace(
      /^(\s*[-*]\s+\[[ x]\]\s+(F-\d{2}\.\d{2}):\s*)\[([^\]]+)\]\(([^)]+)\)(?:\s*[?—-]\s*(.*))?$/gm,
      (match, prefix, id, title, link, desc) => {
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

    featInv = featInv.replace(
      /Feature IDs are stable `F-Nxx` identifiers[^.]*\./,
      'Feature IDs are stable `F-gg.nn` identifiers, where `gg` is the Feature Group (`00` for Foundation) and `nn` is the feature sequence.'
    );

    writeFileSync(featuresFile, featInv);
    results.filesUpdated.push(path.relative(root, featuresFile).replaceAll('\\', '/'));
  }

  // Update docs/roadmap.md
  if (existsSync(roadmapFile)) {
    let rdContent = readFileSync(roadmapFile, 'utf8');
    rdContent = rdContent.replace(/## Slices/g, '## Steps');

    const roadmapMap = new Map();
    let stepIndex = 1;
    rdContent = rdContent.replace(/- \[([ x])] (R-\d+):/g, (match, check, oldRId) => {
      const newRId = `R-01.${String(stepIndex++).padStart(2, '0')}`;
      roadmapMap.set(oldRId, newRId);
      return `- [${check}] ${newRId}:`;
    });

    for (const [oldR, newR] of roadmapMap.entries()) {
      rdContent = rdContent.replaceAll(`after: ${oldR}`, `after: ${newR}`);
      rdContent = rdContent.replaceAll(`with ${oldR}`, `with ${newR}`);
    }

    for (const info of featureMap.values()) {
      rdContent = rdContent.replaceAll(info.oldId, info.newId);
      rdContent = rdContent.replaceAll(`features/${info.oldFolder}/feature.md`, `features/${info.newFolder}/feature.md`);
    }

    // Link use cases where applicable
    for (const uc of useCaseMap.values()) {
      const newPath = `features/${featureMap.get(uc.oldUcId ? info => info.newId === uc.featureNewId : null)?.newFolder || ''}/${uc.newFile}`;
    }

    writeFileSync(roadmapFile, rdContent);
    results.filesUpdated.push(path.relative(root, roadmapFile).replaceAll('\\', '/'));
  }

  // Update config.json
  config.version = 2;
  config.structure = config.structure || {};
  config.structure.features = config.structure.features || {};
  config.structure.features.idPattern = 'F-gg.nn';
  config.structure.features.folderPattern = 'f-gg.nn';
  config.structure.features.featureFile = config.structure.features.featureFile || 'feature.md';
  config.structure.features.featurePathPattern = `${featureRootRel}/f-gg.nn/feature.md`;
  config.structure.features.useCaseIdPattern = 'UC-gg.nn.uu';
  config.structure.features.useCaseFilePattern = 'uc-gg.nn.uu-short-slug.md';
  config.structure.features.useCasePathPattern = `${featureRootRel}/f-gg.nn/uc-gg.nn.uu-short-slug.md`;

  config.structure.roadmap = config.structure.roadmap || {};
  config.structure.roadmap.idPattern = 'R-pp.ss';

  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  results.configUpgraded = true;
  results.filesUpdated.push(path.relative(root, configFile).replaceAll('\\', '/'));

  // Update schema.json
  const schemaFile = path.join(root, '.plan-product/schema.json');
  if (existsSync(schemaFile)) {
    const bundleSchema = path.join(bundle, '.plan-product/schema.json');
    if (existsSync(bundleSchema)) {
      writeFileSync(schemaFile, readFileSync(bundleSchema, 'utf8'));
      results.filesUpdated.push(path.relative(root, schemaFile).replaceAll('\\', '/'));
    }
  }

  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node <plugin-root>/scripts/migrate.mjs [target-repo-root]\nMigrates planning assets from Model v1 (F-Nxx, UC-nnn, R-NNN) to Model v2 (F-gg.nn, UC-gg.nn.uu, R-pp.ss).');
  } else {
    try {
      const target = args[0] || process.cwd();
      console.log(JSON.stringify(migrate(target), null, 2));
    } catch (err) {
      console.error(err.message);
      process.exitCode = 1;
    }
  }
}
