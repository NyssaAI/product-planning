#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(repoRoot, '.version-bump.json');

const usage = 'Usage: bump-version.sh <new-version> | --check | --audit';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getField(value, field) {
  return field.split('.').reduce((current, part) => current?.[/^\d+$/.test(part) ? Number(part) : part], value);
}

function setField(value, field, nextValue) {
  const parts = field.split('.');
  let current = value;
  for (const part of parts.slice(0, -1)) {
    current = current[/^\d+$/.test(part) ? Number(part) : part];
  }
  const last = parts.at(-1);
  current[/^\d+$/.test(last) ? Number(last) : last] = nextValue;
}

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    console.error(`error: .version-bump.json not found at ${configPath}`);
    process.exit(1);
  }
  return readJson(configPath);
}

function readDeclaredVersions(config) {
  return config.files.map(({ path: relPath, field }) => {
    const fullPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      return { relPath, field, version: null, missing: true };
    }
    return { relPath, field, version: getField(readJson(fullPath), field), missing: false };
  });
}

function cmdCheck(config) {
  const declared = readDeclaredVersions(config);
  let hasDrift = false;

  console.log('Version check:');
  console.log('');

  for (const item of declared) {
    const label = `${item.relPath} (${item.field})`;
    if (item.missing) {
      console.log(`  ${label.padEnd(45)}  MISSING`);
      hasDrift = true;
    } else {
      console.log(`  ${label.padEnd(45)}  ${item.version}`);
    }
  }

  console.log('');

  const versions = declared.filter((item) => !item.missing).map((item) => item.version);
  const unique = new Set(versions);
  if (unique.size > 1) {
    console.log('DRIFT DETECTED - versions are not in sync:');
    for (const version of [...unique].sort()) {
      const count = versions.filter((item) => item === version).length;
      console.log(`  ${version} (${count} files)`);
    }
    hasDrift = true;
  } else if (unique.size === 1) {
    console.log(`All declared files are in sync at ${versions[0]}`);
  } else {
    console.log('DRIFT DETECTED - no declared version files were readable');
    hasDrift = true;
  }

  return hasDrift ? 1 : 0;
}

function shouldExclude(relPath, excludes) {
  return relPath.split(path.sep).some((part) => excludes.has(part)) || excludes.has(path.basename(relPath));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function cmdAudit(config) {
  cmdCheck(config);
  console.log('');

  const declared = readDeclaredVersions(config).filter((item) => !item.missing);
  const counts = new Map();
  for (const item of declared) {
    counts.set(item.version, (counts.get(item.version) ?? 0) + 1);
  }
  const currentVersion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!currentVersion) {
    console.error('error: could not determine current version');
    return 1;
  }

  console.log(`Audit: scanning repo for version string '${currentVersion}'...`);
  console.log('');

  const declaredPaths = new Set(config.files.map((item) => item.path.replaceAll('/', path.sep)));
  const excludes = new Set([...(config.audit?.exclude ?? []), '.git', 'node_modules']);
  const matches = [];

  for (const fullPath of walk(repoRoot)) {
    const relPath = path.relative(repoRoot, fullPath);
    if (declaredPaths.has(relPath) || shouldExclude(relPath, excludes)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(currentVersion)) {
      matches.push(relPath);
    }
  }

  if (matches.length === 0) {
    console.log('No undeclared files contain the version string. All clear.');
  } else {
    console.log(`UNDECLARED files containing '${currentVersion}':`);
    for (const match of matches) {
      console.log(`  ${match}`);
    }
    console.log('');
    console.log('Review the above files - if they should be bumped, add them to .version-bump.json');
    console.log('If they should be skipped, add them to the audit.exclude list.');
  }

  return 0;
}

function cmdBump(config, newVersion) {
  if (!/^[0-9]+\.[0-9]+\.[0-9]+/.test(newVersion)) {
    console.error(`error: '${newVersion}' doesn't look like a version (expected X.Y.Z)`);
    return 1;
  }

  console.log(`Bumping all declared files to ${newVersion}...`);
  console.log('');

  for (const { path: relPath, field } of config.files) {
    const fullPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) {
      console.log(`  SKIP (missing): ${relPath}`);
      continue;
    }
    const payload = readJson(fullPath);
    const oldVersion = getField(payload, field);
    setField(payload, field, newVersion);
    writeJson(fullPath, payload);
    console.log(`  ${`${relPath} (${field})`.padEnd(45)}  ${oldVersion} -> ${newVersion}`);
  }

  console.log('');
  console.log('Done. Running audit to check for missed files...');
  console.log('');
  return cmdAudit(config);
}

const arg = process.argv[2] ?? '';
const config = loadConfig();

if (arg === '--check') {
  process.exit(cmdCheck(config));
} else if (arg === '--audit') {
  process.exit(cmdAudit(config));
} else if (arg === '--help' || arg === '-h' || arg === '') {
  console.log(usage);
  console.log('');
  console.log('  <new-version>  Bump all declared files to the given version');
  console.log('  --check        Show current versions, detect drift');
  console.log('  --audit        Check + scan repo for undeclared version references');
  process.exit(0);
} else if (arg.startsWith('--')) {
  console.error(`error: unknown flag '${arg}'`);
  process.exit(1);
} else {
  process.exit(cmdBump(config, arg));
}
