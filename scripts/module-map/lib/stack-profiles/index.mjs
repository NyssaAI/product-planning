import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createLogger } from '../logger.mjs';

const log = createLogger({ module: 'stack-profiles' });

/**
 * @typedef {object} ModuleDef
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} description
 * @property {string[]} flows
 * @property {string[]} packageDependencies
 * @property {string[]} exportEntries
 * @property {string} source
 */

/**
 * @typedef {object} StackProfile
 * @property {string} id
 * @property {number} priority
 * @property {(repoRoot: string, config: import('../config.mjs').PlanProductConfig) => ModuleDef[]} detect
 */

/**
 * @param {string} dir
 * @param {number} [limit]
 */
function listFilesRecursive(dir, limit = 2000) {
  /** @type {string[]} */
  const found = [];
  if (!existsSync(dir)) {
    return found;
  }
  const stack = [dir];
  while (stack.length > 0 && found.length < limit) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isFile()) {
        found.push(full);
      } else if (entry.isDirectory()) {
        stack.push(full);
      }
    }
  }
  return found;
}

/**
 * @param {string} repoRoot
 * @param {string} relRoot
 * @param {string} id
 * @param {string} name
 * @param {import('../config.mjs').PlanProductConfig} config
 * @param {'dotnet' | 'python' | 'go' | 'rust' | 'src-child'} source
 * @returns {ModuleDef}
 */
function makeModule(repoRoot, relRoot, id, name, config, source) {
  return {
    id,
    name,
    root: relRoot.replace(/\\/g, '/'),
    description: `Auto-detected module under \`${relRoot}/\`.`,
    flows: config.modules.flows[id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source,
  };
}

/** @type {StackProfile} */
const dotnetProfile = {
  id: 'dotnet',
  priority: 10,
  detect(repoRoot, config) {
    const files = listFilesRecursive(repoRoot, 500);
    const hasCsproj = files.some((f) => f.endsWith('.csproj'));
    const hasSln = files.some((f) => f.endsWith('.sln'));
    if (!hasCsproj && !hasSln) {
      log.debug('dotnet profile: no signal');
      return [];
    }

    log.info('dotnet profile matched', { hasCsproj, hasSln });
    /** @type {ModuleDef[]} */
    const modules = [];
    const seen = new Set();

    for (const file of files.filter((f) => f.endsWith('.csproj'))) {
      const relDir = path.relative(repoRoot, path.dirname(file)).replace(/\\/g, '/');
      if (!relDir || seen.has(relDir)) {
        continue;
      }
      seen.add(relDir);
      const id = path.basename(relDir).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      modules.push(makeModule(repoRoot, relDir, id, path.basename(relDir), config, 'dotnet'));
    }

    if (modules.length === 0 && existsSync(path.join(repoRoot, 'src'))) {
      for (const entry of readdirSync(path.join(repoRoot, 'src'), { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        const rel = path.join('src', entry.name).replace(/\\/g, '/');
        modules.push(makeModule(repoRoot, rel, entry.name, entry.name, config, 'dotnet'));
      }
    }

    log.debug('dotnet profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile} */
const pythonProfile = {
  id: 'python',
  priority: 20,
  detect(repoRoot, config) {
    const pyproject = path.join(repoRoot, 'pyproject.toml');
    const setupPy = path.join(repoRoot, 'setup.py');
    if (!existsSync(pyproject) && !existsSync(setupPy)) {
      log.debug('python profile: no signal');
      return [];
    }

    log.info('python profile matched');
    /** @type {ModuleDef[]} */
    const modules = [];
    const srcDir = path.join(repoRoot, 'src');
    if (existsSync(srcDir)) {
      for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
          continue;
        }
        const pkgPath = path.join(srcDir, entry.name, '__init__.py');
        if (!existsSync(pkgPath)) {
          continue;
        }
        const rel = path.join('src', entry.name).replace(/\\/g, '/');
        modules.push(makeModule(repoRoot, rel, entry.name, entry.name, config, 'python'));
      }
    }

    if (modules.length === 0) {
      for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'test') {
          continue;
        }
        const initPy = path.join(repoRoot, entry.name, '__init__.py');
        if (existsSync(initPy)) {
          modules.push(makeModule(repoRoot, entry.name, entry.name, entry.name, config, 'python'));
        }
      }
    }

    log.debug('python profile modules', { count: modules.length });
    return modules;
  },
};

const GO_PROFILE_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'vendor',
  'testdata',
]);

/**
 * Package-level module discovery for one Go module tree: every directory
 * under moduleDir with non-generated, non-test .go files becomes a module.
 * Nested go.mod subtrees are excluded, matching Go semantics.
 * @param {string} repoRoot
 * @param {string} moduleDir repo-relative module dir ('' for repo root)
 * @param {import('../config.mjs').PlanProductConfig} config
 * @returns {ModuleDef[]}
 */
function goPackageModules(repoRoot, moduleDir, config) {
  /** @type {ModuleDef[]} */
  const modules = [];
  const absModuleDir = path.join(repoRoot, moduleDir);
  const stack = [absModuleDir];
  let checked = 0;
  while (stack.length > 0 && checked < 2000) {
    const current = stack.pop();
    checked += 1;
    let hasGoFiles = false;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (
          !GO_PROFILE_SKIP_DIRS.has(entry.name) &&
          !existsSync(path.join(current, entry.name, 'go.mod'))
        ) {
          stack.push(path.join(current, entry.name));
        }
        continue;
      }
      if (
        entry.name.endsWith('.go') &&
        !entry.name.endsWith('_test.go') &&
        !entry.name.endsWith('.pb.go')
      ) {
        hasGoFiles = true;
      }
    }
    if (hasGoFiles) {
      const rel = path.relative(repoRoot, current).replace(/\\/g, '/') || '.';
      const id = rel === '.' ? path.basename(repoRoot) : path.basename(rel);
      modules.push(makeModule(repoRoot, rel, id, id, config, 'go'));
    }
  }
  return modules.sort((a, b) => a.root.localeCompare(b.root));
}

/** @type {StackProfile} */
const goProfile = {
  id: 'go',
  priority: 30,
  detect(repoRoot, config) {
    const hasRootMod = existsSync(path.join(repoRoot, 'go.mod'));
    const workFile = path.join(repoRoot, 'go.work');
    if (!hasRootMod && !existsSync(workFile)) {
      log.debug('go profile: no signal');
      return [];
    }

    log.info('go profile matched');
    /** @type {string[]} */
    const moduleDirs = hasRootMod ? [''] : [];
    if (existsSync(workFile)) {
      const text = readFileSync(workFile, 'utf8');
      const blockMatch = text.match(/^use\s*\(([\s\S]*?)\)/m);
      const entries = [
        ...(blockMatch
          ? blockMatch[1].split('\n').map((line) => line.trim())
          : []),
        ...[...text.matchAll(/^use\s+([^\s(][^\n]*)$/gm)].map((m) => m[1]),
      ];
      for (const raw of entries) {
        const entry = raw.replace(/\/\/.*$/, '').trim();
        if (!entry) {
          continue;
        }
        const rel = entry.replace(/^\.\//, '').replace(/\\/g, '/');
        const dir = rel === '.' ? '' : rel;
        if (
          !dir.startsWith('..') &&
          !moduleDirs.includes(dir) &&
          existsSync(path.join(repoRoot, dir, 'go.mod'))
        ) {
          moduleDirs.push(dir);
        }
      }
    }

    /** @type {ModuleDef[]} */
    const modules = [];
    for (const dir of moduleDirs) {
      modules.push(...goPackageModules(repoRoot, dir, config));
    }

    log.debug('go profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile} */
const rustProfile = {
  id: 'rust',
  priority: 40,
  detect(repoRoot, config) {
    const cargoPath = path.join(repoRoot, 'Cargo.toml');
    if (!existsSync(cargoPath)) {
      log.debug('rust profile: no signal');
      return [];
    }

    log.info('rust profile matched');
    const text = readFileSync(cargoPath, 'utf8');
    /** @type {ModuleDef[]} */
    const modules = [];
    const memberRe = /^\s*members\s*=\s*\[(.*?)\]/ms;
    const match = text.match(memberRe);
    if (match) {
      const members = match[1]
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
      for (const member of members) {
        const id = path.basename(member);
        modules.push(makeModule(repoRoot, member, id, id, config, 'rust'));
      }
    }

    if (modules.length === 0) {
      modules.push(makeModule(repoRoot, 'src', 'src', 'src', config, 'rust'));
    }

    log.debug('rust profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile[]} */
const PROFILES = [dotnetProfile, pythonProfile, goProfile, rustProfile].sort(
  (a, b) => a.priority - b.priority
);

/**
 * @param {string} repoRoot
 * @param {import('../config.mjs').PlanProductConfig} config
 * @returns {ModuleDef[]}
 */
export function detectStackModules(repoRoot, config) {
  log.debug('stack profile detection start', { repoRoot });
  for (const profile of PROFILES) {
    const modules = profile.detect(repoRoot, config);
    if (modules.length > 0) {
      log.info('stack profile selected', { profile: profile.id, moduleCount: modules.length });
      return modules;
    }
  }
  log.debug('stack profile detection: no profile matched');
  return [];
}
